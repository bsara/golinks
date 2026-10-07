function updateGoLinksSheetOnFormSubmit(e) {
  const answers = {};
  e.response.getItemResponses().forEach(r => {
    answers[r.getItem().getTitle()] = r.getResponse();
  });

  const file = SpreadsheetApp.openById("<Google-Sheet-Id>");
  const sheet = file.getSheetById(0);

  sheet.appendRow([
    answers.Name,
    answers.URL,
    (answers.Description ?? ""),
    e.response.getRespondentEmail().split('@')[0]
  ]);

  sheet.sort(1);

  e.source.deleteResponse(e.response.getId());
}
