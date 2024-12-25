import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

import { DocumentPosts, getPosts } from '@/components/Home/DocumentPosts';

export default async function HomePage() {
    const queryClient = new QueryClient();
    await queryClient.prefetchQuery({
        queryKey: ['fileList'],
        queryFn: getPosts,
    });
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <DocumentPosts />
        </HydrationBoundary>
    );
}
