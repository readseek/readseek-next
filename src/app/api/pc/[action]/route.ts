/**
 * 负责service分发，处理标准网络协议请求、Cookie验证等逻辑
 */
import { NextRequest, NextResponse } from 'next/server';

import { fileDelete, fileList, fileQuery, fileUpload } from '@/services/document';
import { sys_env, sys_files, sys_users } from '@/services/system';
import { userCancellation, userLogin, userUpdate, userFiles, userProfile } from '@/services/user';

export const preferredRegion = 'auto';
export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * 处理错误请求
 */
async function Notfound(req?: NextRequest, ret?: APIRet) {
    return NextResponse.json(ret || { code: -1, message: 'resource not found' }, { status: 404 });
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    const { action } = params;
    const routes: any = {
        fileList,
        fileQuery,
        userFiles,
        userProfile,
        // only for dev and admin debug
        sys_env,
        sys_files,
        sys_users,
    };

    if (routes[action]) {
        const ret: APIRet = await routes[action](req);
        return NextResponse.json(ret, { status: 200 });
    }
    return Notfound(req);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
    const { action } = params;
    const routes: any = {
        fileUpload,
        fileDelete,
        userLogin,
        userUpdate,
        userCancellation,
    };

    if (routes[action]) {
        const ret: APIRet = await routes[action](req);
        return NextResponse.json(ret, { status: 200 });
    }

    return Notfound(req);
}
