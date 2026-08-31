const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ZIP_NAME = 'Assinador_GG_Digital_JOMTI_2026_MVP.zip';
const TARGET = 'assinador-gg-jomti/assets/JOMTI_2026_Termo_Responsabilidade.pdf';
const EXPECTED_SIZE = 54218;

function findEocd(buffer) {
  const min = Math.max(0, buffer.length - 0xffff - 22);
  for (let i = buffer.length - 22; i >= min; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error('EOCD não encontrado no ZIP.');
}

function extractEntry(zip, target) {
  const eocd = findEocd(zip);
  const centralOffset = zip.readUInt32LE(eocd + 16);
  const totalEntries = zip.readUInt16LE(eocd + 10);
  let pos = centralOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (zip.readUInt32LE(pos) !== 0x02014b50) throw new Error('Diretório central inválido.');
    const method = zip.readUInt16LE(pos + 10);
    const compressedSize = zip.readUInt32LE(pos + 20);
    const nameLen = zip.readUInt16LE(pos + 28);
    const extraLen = zip.readUInt16LE(pos + 30);
    const commentLen = zip.readUInt16LE(pos + 32);
    const localOffset = zip.readUInt32LE(pos + 42);
    const name = zip.subarray(pos + 46, pos + 46 + nameLen).toString('utf8');

    if (name === target) {
      if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Cabeçalho local inválido.');
      const localNameLen = zip.readUInt16LE(localOffset + 26);
      const localExtraLen = zip.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLen + localExtraLen;
      const compressed = zip.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return Buffer.from(compressed);
      if (method === 8) return zlib.inflateRawSync(compressed);
      throw new Error(`Método ZIP não suportado: ${method}`);
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('PDF-modelo não encontrado dentro do ZIP.');
}

module.exports = function handler(req, res) {
  try {
    const zipPath = path.join(process.cwd(), ZIP_NAME);
    const pdf = extractEntry(fs.readFileSync(zipPath), TARGET);
    if (pdf.length !== EXPECTED_SIZE) throw new Error(`Tamanho inesperado: ${pdf.length}`);
    if (pdf.subarray(0, 8).toString('ascii') !== '%PDF-1.7') throw new Error('Cabeçalho PDF inválido.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="JOMTI_2026_Termo_Responsabilidade.pdf"');
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.status(200).send(pdf);
  } catch (error) {
    console.error('Erro ao carregar modelo JOMTI:', error);
    res.status(500).json({ error: 'Não foi possível carregar o modelo original do termo.' });
  }
};
