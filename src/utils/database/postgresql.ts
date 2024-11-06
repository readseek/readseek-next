import type { Category, Tag, Document, User } from '@/types';

import prisma from '@/utils/database/prisma';
import { logError, logInfo, logWarn } from '@/utils/logger';

// https://www.prisma.io/docs/orm/reference/prisma-client-reference#model-queries
export const enum PrismaModelOption {
    upsert = 'upsert', // for a single create,update
    createManyAndReturn = 'createManyAndReturn',

    findFirst = 'findFirst',
    findMany = 'findMany',
    findUnique = 'findUnique',

    deleteMany = 'deleteMany', // delete one or more
    count = 'count',
}

export type DBOptionParams = {
    model: 'Category' | 'Tag' | 'Document' | 'User';
    option: PrismaModelOption;
    data?: (Document | Category | Tag | User)[];
};

export type QueryPaging = {
    pageSize: number;
    pageNum: number;
};

export type RecordData =
    | {
          list: (Category | Tag | Document | User)[];
          total: number;
      }
    | Category
    | Tag
    | Document
    | User
    | null;

export async function count(param: DBOptionParams): Promise<number> {
    const { model } = param;

    const prismaModel: any = prisma[model.toLowerCase()];
    if (!prismaModel) {
        throw new Error(`Invalid model: ${model}`);
    }

    return await prismaModel.count();
}

/**
 * 获取一条或多条记录
 * @param {DBOptionParams} 查询参数
 * @param {pageSize: number,  pageNumber: number} 分页参数
 * @returns {RecordData}
 */
export async function find(param: DBOptionParams, paging: QueryPaging = { pageSize: 10, pageNum: 0 }): Promise<RecordData> {
    const { model, option, data } = param;

    const prismaModel: any = prisma[model.toLowerCase()];
    if (!prismaModel) {
        throw new Error(`Invalid model: ${model}`);
    }

    try {
        let total = 1;
        let rets: any;
        const args: any = {
            where: {
                // @ts-ignore
                id: data && data[0] ? data[0].id : undefined,
            },
        };
        if (option === PrismaModelOption.findFirst) {
            return await prismaModel.findFirst(args);
        }
        if (option === PrismaModelOption.findUnique) {
            return await prismaModel.findUnique(args);
        }

        if (option === PrismaModelOption.findMany) {
            total = await count(param);
            if (total > 0) {
                rets = await prismaModel.findMany({
                    take: paging.pageSize,
                    skip: paging.pageNum,
                });
                return { total, list: rets };
            }
            logWarn('no data in :', model);
        }
    } catch (error) {
        logError('error on find: ', error);
    }

    return null;
}

/**
 * 多表增加、修改
 * 1、ID是否为空：为空是新增，否则是更新；
 * 2、对于涉及关联表的字段需要特别处理；
 * @param {DBOptionParams} 其中，option 可选项仅为：createManyAndReturn、upsert
 * @returns {RecordData}
 */
export async function saveOrUpdate(param: DBOptionParams): Promise<RecordData> {
    const { model, option, data } = param;

    const prismaModel: any = prisma[model.toLowerCase()];
    if (!prismaModel) {
        throw new Error(`Invalid model: ${model}`);
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error(`Invalid data: ${data}`);
    }

    try {
        if (option === PrismaModelOption.createManyAndReturn) {
            return await prismaModel.createManyAndReturn({
                data: data,
                skipDuplicates: false,
                select: {
                    id: true,
                },
            });
        }

        if (option === PrismaModelOption.upsert) {
            const args: any = {
                create: {},
                update: {},
                where: {},
                select: {
                    id: true,
                },
            };
            if (model === 'Document') {
                const document = data[0] as Document;
                document.tags = document.tags.reduce((p: any, c: Tag) => {
                    if (!p.hasOwnProperty('connectOrCreate')) {
                        p['connectOrCreate'] = [];
                    }
                    p['connectOrCreate'].push({
                        where: { id: c.id },
                        create: { key: c.key, value: c.value },
                    });
                    return p;
                }, {});
                args.create = { ...document };
                args.update = { ...document };
                args.where = { id: document.id };
            } else {
                const ctu = data[0] as Category | Tag | User;
                args.where = { id: ctu.id };
                args[ctu.id ? 'update' : 'create'] = { ...ctu };
            }

            logInfo('upsert input: ', args);

            return await prismaModel.upsert(args);
        }
    } catch (error) {
        logError('error on saveOrUpdate: ', error);
    }

    return null;
}

/**
 * 根据id删除一项或多项数据
 * @param {DBOptionParams} 当前仅支持根据id删除
 * @returns {boolean}
 */
export async function remove(param: DBOptionParams): Promise<boolean> {
    const { model, option, data } = param;

    const prismaModel: any = prisma[model.toLowerCase()];
    if (!prismaModel) {
        throw new Error(`Invalid model: ${model}`);
    }

    if (option !== PrismaModelOption.deleteMany) {
        throw new Error(`Invalid option: ${option}`);
    }

    const args: any = {
        where: {
            // @ts-ignore
            id: data && data[0] ? data[0].id : undefined,
        },
    };

    const ret = await prismaModel.deleteMany(args);
    return ret && ret.count > 0;
}