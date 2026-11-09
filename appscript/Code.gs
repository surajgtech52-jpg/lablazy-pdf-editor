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
    const attachmentUrls = [];

    (data.attachments || []).forEach(function(attachment) {
      if (!attachment.data || !attachment.name || !attachment.type) {
        return;
      }

      const parts = attachment.data.split(',');
      if (parts.length < 2) {
        return;
      }

      const bytes = Utilities.base64Decode(parts[1]);
      const blob = Utilities.newBlob(bytes, attachment.type, attachment.name);
      const file = folder.createFile(blob);
      attachmentUrls.push(file.getUrl());
    });

    // 1. Emoji Badges Mapping for Category
    const categoryMap = {
      'bug_ui': '🐛 UI Bug',
      'pdf_editor': '📄 PDF Editor',
      'file_transfer': '📡 File Transfer',
      'feature_req': '✨ Feature Request',
      'format_req': '📑 New Format',
      'other': '💬 General'
    };
    const formattedCategory = categoryMap[data.category] || data.category;

    // 2. Clean Attachment Hyperlink Formula
    let attachmentCell = '- No File -';
    if (attachmentUrls.length > 0) {
      attachmentCell = `=HYPERLINK("${attachmentUrls[0]}", "📎 View Attachment")`;
    }

    // 3. Clean Page URL Path Formula
    let pageCell = data.page || '';
    if (pageCell.startsWith('http')) {
      let shortPath = pageCell.replace('https://lablazy.pages.dev', '');
      if (shortPath === '' || shortPath === '/') shortPath = '/home';
      pageCell = `=HYPERLINK("${pageCell}", "${shortPath}")`;
    }

    // Append standard row
    sheet.appendRow([
      new Date(),
      data.title || '',
      formattedCategory,
      data.description || '',
      attachmentCell,
      pageCell,
      data.userAgent || '',
      data.submittedAt || ''
    ]);

    // Format newly added row immediately
    const lastRow = sheet.getLastRow();
    const newRowRange = sheet.getRange(lastRow, 1, 1, 8);
    newRowRange.setWrap(true);
    newRowRange.setVerticalAlignment('middle');

    return response({
      success: true,
      message: 'Feedback saved successfully.'
    });
  } catch (error) {
    console.error(error.stack || error.message || error);

    return response({
      success: false,
      error: error.message || 'Could not save feedback.'
    });
  }
}

function doGet() {
  return response({
    success: true,
    message: 'Feedback service is running.'
  });
}

// Function to format all existing data rows in bulk
function formatFeedbackSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error('Sheet tab not found: ' + SHEET_NAME);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const numRows = lastRow - 1;

  // Format Attachments Column (Column E / Column 5)
  const rangeE = sheet.getRange(2, 5, numRows, 1);
  const valuesE = rangeE.getValues();

  for (let i = 0; i < valuesE.length; i++) {
    const val = String(valuesE[i][0]).trim();
    const cell = rangeE.getCell(i + 1, 1);

    if (val.startsWith('http')) {
      cell.setRichTextValue(
        SpreadsheetApp.newRichTextValue()
          .setText('📎 View Attachment')
          .setLinkUrl(val)
          .build()
      );
      cell.setFontColor('#2563EB');
    } else if (val === '' || val === '# Place' || val === 'null' || val === '- No File -') {
      cell.setValue('- No File -');
      cell.setFontColor('#94A3B8');
    }
  }

  // Format Page URL Column (Column F / Column 6)
  const rangeF = sheet.getRange(2, 6, numRows, 1);
  const valuesF = rangeF.getValues();

  for (let j = 0; j < valuesF.length; j++) {
    const pageUrl = String(valuesF[j][0]).trim();
    const cellF = rangeF.getCell(j + 1, 1);

    if (pageUrl.startsWith('http')) {
      let cleanLabel = pageUrl.replace('https://lablazy.pages.dev', '');
      if (cleanLabel === '' || cleanLabel === '/') cleanLabel = '/home';

      cellF.setRichTextValue(
        SpreadsheetApp.newRichTextValue()
          .setText(cleanLabel)
          .setLinkUrl(pageUrl)
          .build()
      );
      cellF.setFontColor('#2563EB');
    }
  }

  // Apply auto-wrap and vertical centering to all data rows
  const allDataRange = sheet.getRange(2, 1, numRows, 8);
  allDataRange.setWrap(true);
  allDataRange.setVerticalAlignment('middle');
}

function response(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}