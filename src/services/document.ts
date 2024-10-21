import type { NextRequest } from 'next/server';

import fs, { createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline, Readable } from 'node:stream';
import { promisify } from 'util';

import { getFileHash, isDevModel, systemLog } from '@/utils/common';
import LevelDB from '@/utils/database/leveldb';
import { deleteEmbeddings, parseAndSaveContentEmbedding } from '@/utils/embeddings';

import { saveOrUpdate } from './db';

const pipelineAsync = promisify(pipeline);
const UPLOAD_PATH = path.join(process.cwd(), process.env.__RSN_UPLOAD_PATH ?? 'public/uploads');

/**
 * File upload entry
 * @param req NextRequest
 * @returns APIRet
 */
export async function fileUpload(req: NextRequest): Promise<APIRet> {
    try {
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return { code: -1, data: false, message: 'Invalid content type' };
        }

        let file: File;
        const formData = await req.formData();
        if (!formData || !formData.has('file')) {
            return { code: -1, data: false, message: 'no parameter file upload' };
        }

        file = formData.get('file') as File;

        const fileHash = await getFileHash(file);
        const fileName = `${fileHash}.${file.name.split('.')[1]}`;
        const filePath = path.join(UPLOAD_PATH, fileName);

        // avoid production duplicate uploads
        if (!isDevModel() && fs.existsSync(filePath)) {
            return {
                code: 1,
                data: {
                    fileName,
                    originalFilename: file.name,
                    mimetype: file.type,
                    size: file.size,
                },
                message: 'file already uploaded',
            };
        }

        // @ts-ignore
        await pipelineAsync(Readable.fromWeb(file.stream()), createWriteStream(filePath));

        const parsedResult = await parseAndSaveContentEmbedding(filePath);
        if (parsedResult.state) {
            const [ret1, ret2] = await Promise.all([
                // save local mappings
                LevelDB.getSharedDB.put(fileHash, filePath),
                // save supsbase postgresql
                saveOrUpdate({
                    model: 'Document',
                    data: {
                        id: fileHash,
                        tags: [1, 5],
                        categoryId: 1,
                        userId: 1,
                        ...parsedResult.meta,
                    },
                }),
            ]);
            systemLog(0, ret1, ret2);
            return {
                code: 0,
                data: {
                    fileName,
                    originalFilename: file.name,
                    mimetype: file.type,
                    size: file.size,
                },
                message: 'upload and save success',
            };
        }
    } catch (error: any) {
        systemLog(-1, 'fileUpload service: ', error);
    }
    return { code: -1, data: false, message: 'fileUpload failed' };
}

/**
 * File Embedding delete
 * @param req NextRequest
 * @returns APIRet
 */
export async function fileDelete(req: NextRequest): Promise<APIRet> {
    const ret = await deleteEmbeddings('');
    return { code: 0, data: ret, message: 'success' };
}

/**
 * Uploaded files for a login user
 * @param req NextRequest
 * @returns APIRet
 */
export async function fileList(req: NextRequest): Promise<APIRet> {
    return { code: 0, data: [], message: 'success' };
}

/**
 * Query file with keywords
 * @param req NextRequest
 * @returns APIRet
 */
export async function fileQuery(req: NextRequest): Promise<APIRet> {
    return { code: 0, data: {}, message: 'success' };
}