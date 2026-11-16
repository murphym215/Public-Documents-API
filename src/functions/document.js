/*
    document.js is the endpoint that returns the document from private Blob Storage. 
    The document name is passed in the query string.
 */
const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

app.http('document', {
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

            // Get the document name from the query string:
            // /api/document?name=Test%20Document%201.pdf
            const fileName = request.query.get('name');

            if (!fileName) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'The document name is required.'
                    }
                };
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

            const blobClient =
                containerClient.getBlobClient(fileName);

            // Make sure the requested document exists.
            const exists = await blobClient.exists();

            if (!exists) {
                return {
                    status: 404,
                    jsonBody: {
                        error: 'Document not found.'
                    }
                };
            }

            // Download the document from private Blob Storage.
            const downloadResponse =
                await blobClient.download();

            const contentType =
                downloadResponse.contentType ||
                'application/octet-stream';

            // Azure Functions expects a web-compatible stream.
            const body =
                downloadResponse.readableStreamBody;

            return {
                status: 200,

                headers: {
                    'Content-Type': contentType,
                    'Content-Disposition':
                        `inline; filename="${encodeURIComponent(fileName)}"`,
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache',
'Expires': '0'
                },

                body: body
            };

        } catch (err) {

            context.error(
                'Error retrieving document from Blob Storage:',
                err
            );

            return {
                status: 500,
                jsonBody: {
                    error: 'Unable to retrieve document.',
                    details: err.message
                }
            };
        }
    }
});