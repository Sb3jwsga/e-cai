/**
 * Google Apps Script untuk menghubungkan Website Absensi (AI Studio) ke Google Sheets.
 * Petunjuk Penggunaan:
 * 1. Buat Spreadsheet baru di Google Sheets.
 * 2. Tambahkan 4 Sheet (Tab) dengan nama: "users", "peserta", "events", "attendance".
 * 3. Isi baris pertama (Header) masing-masing sheet sebagai berikut:
 *    - users: id, username, password, level, profileId
 *    - peserta: id, nama_lengkap, jenis_kelamin, nomer_whatsapp, kelompok, desa
 *    - events: id, nama_event, tanggal_event, jam_mulai_event, jam_selesai_event, deskripsi_event, type
 *    - attendance: id, eventId, pesertaId, type, timestamp, panitiaId
 * 4. Buka menu Extensions > Apps Script.
 * 5. Hapus kode yang ada dan tempel kode di bawah ini.
 * 6. Ubah 'YOUR_SPREADSHEET_ID' dengan ID Spreadsheet Anda (ada di URL Spreadsheet).
 * 7. Klik Deploy > New Deployment > Web App.
 * 8. Set "Execute as: Me" dan "Who has access: Anyone".
 * 9. Copy URL Web App yang muncul untuk digunakan di aplikasi.
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // GANTI DENGAN ID SPREADSHEET ANDA

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const action = e.parameter.action;
    const table = e.parameter.table;

    if (!action || action === 'readAll') {
      const result = {};
      const sheets = ss.getSheets();
      sheets.forEach(sheet => {
        const name = sheet.getName();
        result[name] = getSheetData(sheet);
      });
      return createJsonResponse(result);
    }

    if (action === 'read' && table) {
      const sheet = ss.getSheetByName(table);
      if (!sheet) throw new Error('Table not found: ' + table);
      return createJsonResponse(getSheetData(sheet));
    }

    throw new Error('Invalid action');
  } catch (error) {
    return createJsonResponse({ error: error.message }, 500);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const body = JSON.parse(e.postData.contents);
    const { action, table, data } = body;

    const sheet = ss.getSheetByName(table);
    if (!sheet) throw new Error('Table not found: ' + table);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (action === 'create') {
      const newRow = headers.map(header => data[header] !== undefined ? data[header] : '');
      sheet.appendRow(newRow);
      return createJsonResponse({ success: true, message: 'Data created' });
    }

    if (action === 'update') {
      const values = sheet.getDataRange().getValues();
      const idIndex = headers.indexOf('id');
      if (idIndex === -1) throw new Error('Table missing "id" column');

      let found = false;
      for (let i = 1; i < values.length; i++) {
        if (values[i][idIndex] == data.id) {
          const updatedRow = headers.map((header, idx) => 
            data[header] !== undefined ? data[header] : values[i][idx]
          );
          sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
          found = true;
          break;
        }
      }
      if (!found) throw new Error('Data with ID ' + data.id + ' not found');
      return createJsonResponse({ success: true, message: 'Data updated' });
    }

    if (action === 'delete') {
      const values = sheet.getDataRange().getValues();
      const idIndex = headers.indexOf('id');
      
      let found = false;
      for (let i = 1; i < values.length; i++) {
        if (values[i][idIndex] == data.id) {
          sheet.deleteRow(i + 1);
          found = true;
          break;
        }
      }
      if (!found) throw new Error('Data with ID ' + data.id + ' not found');
      return createJsonResponse({ success: true, message: 'Data deleted' });
    }

    throw new Error('Invalid action');
  } catch (error) {
    return createJsonResponse({ error: error.message }, 500);
  }
}

function getSheetData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function createJsonResponse(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
