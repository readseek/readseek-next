'use server';

import { NextRequest } from 'next/server';

import { logError, logInfo, logWarn } from '@/utils/logger';

const ADMContactURL = process.env?.__RSN_ADMContact_URL;

/**
 * Class Method Decorator for API Route Logging.
 */
export function LogAPIRoute(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
        try {
            const req = args[0] as NextRequest;

            // if (req.method?.toUpperCase() === 'POST' && req.headers.get('content-type')?.toLowerCase() === 'application/json') {
            // create a new request when use body stream more than once
            // const jsonStr = JSON.stringify(await req.json());
            // args[0] = new NextRequest(req.url, {
            //     credentials: 'include',
            //     mode: 'same-origin',
            //     method: req.method,
            //     headers: req.headers,
            //     body: jsonStr,
            // });
            // }

            logInfo(`🎯 Ip: ${req.ip}, ${req.method}. API ${propertyKey} is called by url: ${req.url}`);

            return await originalMethod.apply(this, args);
        } catch (error) {
            logError(`[${new Date().toISOString()}] Error:`, error);
            return { code: 500, message: `Internal error, If you encounter this error multiple times, please contact the administrator: ${ADMContactURL}` };
        }
    };
    return descriptor;
}

/**
 * Class Method Decorator for checking user login status.
 */
export function CheckLogin(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
        try {
            const req = args[0] as NextRequest;

            const accessToken = req.cookies.get('access-token');
            const clientSecret = req.headers.get('client-secret');

            if (!accessToken || !clientSecret) {
                logWarn('⛔️ login check failed: access-token or client-secret was invalid');
                // return { code: 1, message: 'Unauthorized request' };
            }

            return await originalMethod.apply(this, args);
        } catch (error) {
            logError(`[${new Date().toISOString()}] Error:`, error);
            return { code: 500, message: `Internal error, If you encounter this error multiple times, please contact the administrator: ${ADMContactURL}` };
        }
    };
    return descriptor;
}
