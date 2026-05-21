const fs = require('fs');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');
const { logger } = require('./logger');

/**
 * Upload a ticket PDF to storage (Azure Blob Storage if configured, otherwise local disk).
 *
 * @param {Buffer} buffer  PDF file buffer
 * @param {string} filename  The file name
 * @returns {Promise<string>} Public URL of the uploaded ticket
 */
async function uploadPDF(buffer, filename) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_CONTAINER_NAME || 'tickets';

  if (connectionString) {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists({ access: 'container' });

      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: 'application/pdf' },
      });

      return blockBlobClient.url;
    } catch (err) {
      logger.error({ err }, 'Azure Blob Storage upload failed. Falling back to local storage.');
    }
  }

  // Local storage fallback (development/testing)
  const uploadDir = path.join(__dirname, '../../public/tickets');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  const port = process.env.PORT || 3000;
  const baseUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
  return `${baseUrl}/tickets/${filename}`;
}

module.exports = { uploadPDF };
