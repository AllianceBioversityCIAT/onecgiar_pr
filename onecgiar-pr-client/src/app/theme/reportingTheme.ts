import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

export const reportingTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#e6eafe',
      100: '#c6cdf4',
      200: '#8e9be8',
      300: '#5569dd', // Main custom Color
      400: '#273ec5',
      500: '#1c2c8a',
      600: '#18246d',
      700: '#151d58',
      800: '#101542',
      900: '#0a0c25',
      950: '#05071a'
    },
    secondary: {
      50: '#dde0ee',
      100: '#9ca2c3',
      200: '#6a73a4',
      300: '#484f77',
      400: '#2a2e45', // Main custom Color
      500: '#1a1c2a',
      600: '#16171e',
      700: '#111218',
      800: '#0d0d12',
      900: '#08080b',
      950: '#050507'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.300}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}'
        },
        secondary: {
          color: '{secondary.300}',
          contrastColor: '#ffffff',
          hoverColor: '{secondary.600}',
          activeColor: '{secondary.700}'
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.700}',
          focusColor: '{primary.800}'
        }
      }
    }
  }
});
