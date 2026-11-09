const SPREADSHEET_ID = '1zC6VPICEctmU9lpGoPfBRmQAowpeh6WC5QLydm94mo4';
const SHEET_NAME = 'Sheet1';
const DRIVE_FOLDER_ID = '1EgdWHZbs4IFMxFTwY3tKqnBeGp_I2fBm';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return response({
        success: false,
        error: 'Invalid request. Submit from the website, not the Run button.'
      });
    }

    const data = JSON.parse(e.postData.contents);

    if (!data.title || !data.category) {
      return response({
        success: false,
        error: 'Missing required fields.'
      });
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error(
        'Sheet tab not found: ' + SHEET_NAME +
        '. Available tabs: ' +
        spreadsheet.getSheets().map(function(item) {
          return item.getName();
        }).join(', ')
      );
    }

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const attachmentLinks = [];

    (data.attachments || []).forEach(function(attachment) {
      if (!attachment.data || !attachment.name || !attachment.type) {
        return;
      }

      const parts = attachment.data.split(',');
      if (parts.length < 2) {
        return;
      }

      const bytes = Utilities.base64Decode(parts[1]);

      const blob = Utilities.newBlob(
        bytes,
        attachment.type,
        attachment.name
      );

      const file = folder.createFile(blob);

      // Files remain private in Google Drive.
      attachmentLinks.push(file.getUrl());
    });

    // --- ADDED ONLY CATEGORY BADGES ---
    const categoryMap = {
      'bug_ui': '🐛 UI Bug',
      'pdf_editor': '📄 PDF Editor',
      'file_transfer': '📡 File Transfer',
      'feature_req': '✨ Feature Request',
      'format_req': '📑 New Format',
      'other': '💬 General'
    };
    const formattedCategory = categoryMap[data.category] || data.category || '';
    // ----------------------------------

    sheet.appendRow([
      new Date(),
      data.title || '',
      formattedCategory,
      data.description || '',
      attachmentLinks.length ? attachmentLinks.join('\n') : '- No File -',
      data.page || '',
      data.userAgent || '',
      data.submittedAt || ''
    ]);

    const lastRow = sheet.getLastRow();
    setAttachmentCell(sheet.getRange(lastRow, 5), attachmentLinks);

    return response({
      success: true,
      message: 'Bug report saved successfully.'
    });

  } catch (error) {
    console.error(error.stack || error.message || error);

    return response({
      success: false,
      error: error.message || 'Could not save bug report.'
    });
  }
}

function doGet() {
  return response({
    success: true,
    message: 'Bug report service is running.'
  });
}

function formatAttachmentLinks() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error('Sheet tab not found: ' + SHEET_NAME);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return;
  }

  const range = sheet.getRange(2, 5, lastRow - 1, 1);
  const values = range.getValues();

  values.forEach(function(row, index) {
    const links = String(row[0] || '')
      .split(/\r?\n/)
      .map(function(value) {
        return value.trim();
      })
      .filter(function(value) {
        return /^https?:\/\//i.test(value);
      });

    setAttachmentCell(range.getCell(index + 1, 1), links);
  });
}

function setAttachmentCell(cell, links) {
  if (!links.length) {
    cell.setValue('- No File -');
    return;
  }

  const labels = links.map(function(url, index) {
    return 'View Attachment ' + (index + 1);
  });
  const text = labels.join('\n');
  const builder = SpreadsheetApp.newRichTextValue().setText(text);
  let offset = 0;

  links.forEach(function(url, index) {
    const label = labels[index];
    builder.setLinkUrl(offset, offset + label.length, url);
    offset += label.length + 1;
  });

  cell.setRichTextValue(builder.build());
  cell.setWrap(true);
  cell.setVerticalAlignment('middle');
}

function response(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}