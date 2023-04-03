declare module '*.json';

declare namespace Next {
    interface NextApiRequest {
        userId: string;
    }
}