import { red, grey } from "@mui/material/colors";
import { createTheme } from "@mui/material/styles";

// A custom theme for this app
const theme = createTheme({
  palette: {
    primary: {
      main: "#c20c0c",
    },
    secondary: {
      main: "#0c72c3",
    },
    error: {
      main: red.A400,
    },
    background: {
      default: grey.A100,
    },
  },
});

export default theme;
