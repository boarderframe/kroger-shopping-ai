import { createTheme } from '@mui/material/styles'

// Base theme configuration with consistent typography and component overrides
const baseThemeOptions = {
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderColor: 'rgba(0, 0, 0, 0.08)',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
        elevation2: {
          boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
        },
        elevation3: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)',
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: 0,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined' as const,
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
}

// Kroger brand-inspired light theme: blue/white
export const indigoTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'light',
    primary: { 
      main: '#004EA8', 
      light: '#2C6FCC', 
      dark: '#003B80', 
      contrastText: '#ffffff' 
    },
    secondary: { 
      main: '#007AC2',
      light: '#33A1D1',
      dark: '#005A8B',
      contrastText: '#ffffff'
    },
    error: {
      main: '#D32F2F',
    },
    warning: {
      main: '#F57C00',
    },
    info: {
      main: '#0288D1',
    },
    success: {
      main: '#388E3C',
    },
    background: { 
      default: '#FAFAFA',
      paper: '#FFFFFF' 
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
})

// Alternative slate theme with softer colors
export const slateTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'light',
    primary: { 
      main: '#475569', 
      light: '#64748B', 
      dark: '#334155', 
      contrastText: '#ffffff' 
    },
    secondary: { 
      main: '#06B6D4',
      light: '#22D3EE',
      dark: '#0891B2',
      contrastText: '#ffffff'
    },
    error: {
      main: '#EF4444',
    },
    warning: {
      main: '#F59E0B',
    },
    info: {
      main: '#3B82F6',
    },
    success: {
      main: '#10B981',
    },
    background: { 
      default: '#F8FAFC',
      paper: '#FFFFFF' 
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
})


