import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { UPLOAD_LIMITS } from '@/lib/constants';
import { validateUpload, buildStoragePath } from '@/lib/security/upload-validator';
import { sha256 } from '@/lib/security/checksum';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const engagementId = formData.get('engagement_id') as string | null;
  const file = formData.get('file') as File | null;
  // Optional: question IDs the uploader explicitly links this document to
  const questionIdsRaw = formData.get('question_ids') as string | null;
  const questionIds: string[] = questionIdsRaw ? JSON.parse(questionIdsRaw) : [];

  if (!engagementId || !file) {
    return NextResponse.json({ error: 'Missing engagement_id or file' }, { status: 400 });
  }

  // Verify caller is vendor or reviewer on this compliance engagement
  const { data: engagement } = await supabase
    .from('compliance_engagements')
    .select('id, vendor_user_id, reviewer_user_id, template_id')
    .eq('id', engagementId)
    .maybeSingle();

  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (engagement.vendor_user_id !== user.id && engagement.reviewer_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const headBytes = buffer.subarray(0, 16);

  const validation = validateUpload({
    filename: file.name,
    declaredMime: file.type,
    size: buffer.byteLength,
    headBytes,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 422 });
  }
  if (buffer.byteLength > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 100 MB)' }, { status: 413 });
  }

  const effectiveMime = validation.effectiveMime!;
  const extension = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase();
  const documentId = randomUUID();
  const checksum = sha256(buffer);

  // Dedup: same engagement + same checksum → skip
  const { data: existing } = await supabase
    .from('compliance_documents')
    .select('id')
    .eq('compliance_engagement_id', engagementId)
    .eq('storage_path', `compliance/${engagementId}/${documentId}`)
    .maybeSingle();

  // Check by filename + size as a lighter dedup signal
  if (existing) {
    return NextResponse.json({ id: existing.id, status: 'duplicate' }, { status: 200 });
  }

  const storagePath = `compliance/${engagementId}/${documentId}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, buffer, { contentType: effectiveMime, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const fileType = extension;
  const { data: doc, error: dbError } = await supabase
    .from('compliance_documents')
    .insert({
      id: documentId,
      compliance_engagement_id: engagementId,
      uploaded_by: user.id,
      file_name: file.name,
      file_type: fileType,
      storage_path: storagePath,
      extraction_status: 'queued',
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from('documents').remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // If vendor selected specific questions, pre-create answer stubs so the
  // extractor knows which questions to prioritize for this document.
  if (questionIds.length > 0) {
    const answerStubs = questionIds.map(qid => ({
      compliance_engagement_id: engagementId,
      question_id: qid,
      answer_status: 'missing' as const,
      extraction_source: documentId,
      submitted_by: user.id,
    }));
    await supabase
      .from('answers')
      .upsert(answerStubs, { onConflict: 'compliance_engagement_id,question_id', ignoreDuplicates: true });
  }

  return NextResponse.json({
    id: doc.id,
    status: 'queued',
    file_name: doc.file_name,
    extraction_status: doc.extraction_status,
  }, { status: 201 });
}
