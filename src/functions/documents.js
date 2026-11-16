/*
    documents.js is the endpoint that returns the list of documents from private Blob Storage.
 */
const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

app.http('documents', {
    methods: ['GET'],
    authLevel: 'anonymous',

    handler: async (request, context) => {

        try {

            const storageAccountName =
                process.env.STORAGE_ACCOUNT_NAME;

            const containerName =
                process.env.DOCUMENT_CONTAINER_NAME;

            if (!storageAccountName || !containerName) {
                throw new Error(
                    'Storage account or container configuration is missing.'
                );
            }

            const credential =
                new DefaultAzureCredential();

            const blobServiceClient =
                new BlobServiceClient(
                    `https://${storageAccountName}.blob.core.windows.net`,
                    credential
                );

            const containerClient =
                blobServiceClient.getContainerClient(containerName);

            const documents = [];

            for await (const blob of containerClient.listBlobsFlat()) {

                documents.push({
                    id: blob.name,
                    title: blob.name,
                    fileName: blob.name,
                    contentType: blob.properties.contentType,
                    size: blob.properties.contentLength,
                    lastModified: blob.properties.lastModified,
                    url: `/api/document?name=${encodeURIComponent(blob.name)}`
                });
            }

            return {
                status: 200,
                jsonBody: documents
            };

        } catch (err) {

            context.error(
                'Error retrieving documents from Blob Storage:',
                err
            );

            return {
                status: 500,
                jsonBody: {
                    error: 'Unable to retrieve documents.',
                    details: err.message
                }
            };
        }
    }
});