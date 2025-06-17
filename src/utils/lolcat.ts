export const getLolcatHtml = (text: string): string => {
  const vibrantColors = [
    '#ff0000', '#ff4000', '#ff8000', '#ffbf00',
    '#ffff00', '#bfff00', '#80ff00', '#40ff00',
    '#00ff00', '#00ff40', '#00ff80', '#00ffbf',
    '#00ffff', '#00bfff', '#0080ff', '#0040ff',
    '#0000ff', '#4000ff', '#8000ff', '#bf00ff',
    '#ff00ff', '#ff00bf', '#ff0080', '#ff0040'
  ];
  const gradient = `linear-gradient(to right, ${vibrantColors.join(', ')})`;
  const style = `
    background-image: ${gradient};
    background-size: 100% 100%;
    -webkit-background-clip: text;
    -moz-background-clip: text;
    -ms-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    -moz-text-fill-color: transparent;
    display: inline-block;
    text-shadow: none;
  `.replace(/\s+/g, ' ').trim();
  return `<span style="${style}">${text}</span>`;
};
