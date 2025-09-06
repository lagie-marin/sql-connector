declare module './client' {
    interface Client {
        [key: string]: any; // Dynamic methods added on the fly
    }

    const client: Client;
    export = client;
}