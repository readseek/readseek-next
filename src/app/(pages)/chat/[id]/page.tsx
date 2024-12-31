'use client';

import type { Document } from '@/models/Document';

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ErrorImage, LoadingImage } from '@/components/ImageView';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ToastAction } from '@/components/ui/toast';
import { GET_URI, POST_URI } from '@/constants/application';
import { getData, postJson } from '@/utils/http/client';
import { logInfo, logWarn } from '@/utils/logger';

const FormSchema = z.object({
    input: z
        .string()
        .min(2, {
            message: '起码写两个字吧...',
        })
        .max(500, {
            message: '最多一次发送500字噢',
        }),
});

export default function ChatPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
    });
    const { toast } = useToast();
    const [doc, setDocument] = useState<Document>();
    const [message, setMessage] = useState<Array<string>>(['']);

    useEffect(() => {
        if (doc) {
            document.title = `${doc?.title} | 开启交互式内容精读 | 搜读`;
        }
    }, [doc]);

    const resetForm = () => {
        form.reset({
            input: '',
        });
    };

    const { isError, isPending } = useQuery({
        queryKey: [GET_URI.initChat, params.id],
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const ret = await getData(`/api/web/initChat?id=${params.id}`);
            if (!ret || ret?.code) {
                toast({
                    variant: 'destructive',
                    title: '操作失败',
                    description: `${ret?.message || '网络异常~'}`,
                    duration: 30000,
                    action: (
                        <ToastAction
                            altText="Try again"
                            onClick={() => {
                                router.back();
                            }}>
                            稍后再试
                        </ToastAction>
                    ),
                });
                return null;
            }
            setDocument(ret?.data);
            return ret?.data;
        },
    });

    const searchMutation = useMutation({
        mutationKey: [POST_URI.fileSearch, params.id],
        mutationFn: async (data: z.infer<typeof FormSchema>) => {
            const ret = await postJson('/api/web/fileSearch', { input: data.input, id: params.id });
            if (!ret || ret?.code) {
                toast({
                    variant: 'destructive',
                    title: '响应失败',
                    description: `${ret?.message || '网络异常~'}`,
                    action: <ToastAction altText="Try again">再来一次</ToastAction>,
                });
                return [];
            }
            return ret?.data;
        },
        onSuccess: (resp: Array<string>) => {
            if (resp.length) {
                resetForm();
                setMessage(message.concat(resp[0]));
            }
        },
        onError: (e: any) => {
            logWarn('error on file search: ', e);
            toast({
                title: '啊噢，失败了',
                description: '操作失败，请稍后再试试~',
            });
        },
    });

    if (isPending) {
        return (
            <div className="main-content">
                <LoadingImage />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="main-content">
                <ErrorImage />
            </div>
        );
    }

    return (
        <div className="main-content !justify-between">
            <div className="no-scrollbar my-5 w-[80%] overflow-y-scroll rounded-md bg-gray-100 p-4">
                {message.map((m: string, i: number) => (
                    <code className="text-black" key={`chat_msg_${i}`}>
                        {m}
                    </code>
                ))}
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit((data: any) => searchMutation.mutate(data))} onReset={resetForm} className="mb-12 w-2/3 space-y-6">
                    <FormField
                        control={form.control}
                        name="input"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>请在下方回复你想要了解的信息：</FormLabel>
                                <FormControl>
                                    <div className="flex items-center">
                                        <Textarea
                                            placeholder="单次最大长度不要超过500字"
                                            className="mr-4 resize-none"
                                            {...field}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    form.handleSubmit((data: any) => searchMutation.mutate(data))();
                                                }
                                            }}
                                        />
                                        <Button type="submit" disabled={searchMutation.isPending}>
                                            发送
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormDescription>
                                    You can <span>@mention</span> other users.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </form>
            </Form>
        </div>
    );
}
