const formatTextForHTML = (text) => {
  if (!text) return "";
  let formattedText = text;

  // Konversi sintaks Markdown ke tag HTML
  formattedText = formattedText.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );
  formattedText = formattedText.replace(/\*(.*?)\*/g, "<em>$1</em>");
  formattedText = formattedText.replace(/<u>(.*?)<u>/g, "<u>$1</u>");
  formattedText = formattedText.replace(/\n/g, "<br>");

  return formattedText;
};
export default formatTextForHTML;
