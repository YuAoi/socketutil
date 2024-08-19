const downloadText = function (content, filename) {
  const eleLink = document.createElement("a");
  eleLink.download = filename;
  eleLink.style.display = "none";
  const blob = new Blob([content]);
  eleLink.href = URL.createObjectURL(blob);
  document.body.appendChild(eleLink);
  eleLink.click();
  document.body.removeChild(eleLink);
};
