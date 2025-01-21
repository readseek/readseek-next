import type { User } from '@/models/User';
import type { NextRequest } from 'next/server';

import { getUserFiles, getUserInfo } from '@/utils/database';
import { LogAPIRoute, CheckLogin } from '@/utils/http/decorators';
import { logError, logInfo } from '@/utils/logger';

import BaseService from './_base';

class UserService extends BaseService {
    @LogAPIRoute
    @CheckLogin
    async login(req: NextRequest): Promise<APIRet> {
        const params = await req.json();
        logInfo('start login...', params);
        return { code: 0, data: [], message: 'ok' };
    }

    @LogAPIRoute
    @CheckLogin
    async update(req: NextRequest): Promise<APIRet> {
        const params = await req.json();
        logInfo('start update...', params);
        return { code: 0, data: [], message: 'ok' };
    }

    @LogAPIRoute
    @CheckLogin
    async cancel(req: NextRequest): Promise<APIRet> {
        const params = await req.json();
        logInfo('start cancel...', params);
        return { code: 0, data: [], message: 'ok' };
    }

    @LogAPIRoute
    @CheckLogin
    async profile(req: NextRequest): Promise<APIRet> {
        // TODO: 正式情况下，从拦截器中存放的变量获取
        const uid = Number(req.nextUrl.searchParams.get('uid'));
        const user = (await getUserInfo(uid)) as User;
        if (user) {
            return { code: 0, data: user, message: 'ok' };
        }
        return { code: 0, data: null, message: 'data not found' };
    }

    @LogAPIRoute
    @CheckLogin
    async files(req: NextRequest): Promise<APIRet> {
        let user: User = { id: this.getSharedUid() };

        const searchParams = req.nextUrl.searchParams;

        const pageSize = Number(searchParams.get('size')) || 10;
        const pageNum = Number(searchParams.get('page')) || 1;
        // 根据标题模糊查询
        const title = searchParams.get('title');
        if (title && title.trim().length > 0) {
            user = Object.assign(user, {
                posts: [{ title: title }],
            });
        }

        const list = await getUserFiles({ title, pageSize, pageNum });
        if (list) {
            return { code: 0, data: list, message: 'ok' };
        }
        return { code: 0, data: [], message: 'no files found on given userId' };
    }
}

const service: UserService = new UserService();

export default service;
