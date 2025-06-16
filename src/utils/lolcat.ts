export const getLolcatHtml = (text: string): string => {
  // A richer "truecolor" palette for a more vibrant gradient
  const vibrantColors = [
    '#ff0000', '#ff4000', '#ff8000', '#ffbf00', // Reds to Oranges
    '#ffff00', '#bfff00', '#80ff00', '#40ff00', // Yellows to Greens
    '#00ff00', '#00ff40', '#00ff80', '#00ffbf', // Greens
    '#00ffff', '#00bfff', '#0080ff', '#0040ff', // Cyans to Blues
    '#0000ff', '#4000ff', '#8000ff', '#bf00ff', // Blues to Purples
    '#ff00ff', '#ff00bf', '#ff0080', '#ff0040'  // Magentas to Pinks
  ];

  // Create the CSS linear gradient string.
  // The gradient will flow horizontally across the text.
  const gradientDirection = 'to right'; // Or '90deg', '45deg', etc.
  const colorStops = vibrantColors.join(', ');
  const gradient = `linear-gradient(${gradientDirection}, ${colorStops})`;

  // Inline styles for the text gradient effect.
  // Using 'display: inline-block' can help ensure the gradient renders correctly across the text.
  const style = `
    background-image: ${gradient};
    background-size: 100% 100%; /* Ensure gradient covers the text, can be adjusted */
    -webkit-background-clip: text; /* Safari/Chrome */
    -moz-background-clip: text;    /* Firefox */
    -ms-background-clip: text;     /* IE/Edge (older) */
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent; /* For some Webkit browsers */
    -moz-text-fill-color: transparent;    /* For some Gecko browsers */
    display: inline-block; /* Or 'inline', depending on desired layout interaction */
    text-shadow: none; /* Important to prevent text shadow from obscuring the gradient */
  `.replace(/\s+/g, ' ').trim(); // Minify the style string for inline use

  // Wrap the text in a single span with these styles.
  return `<span style="${style}">${text}</span>`;
};
