import 'react-native-svg';

// Phosphor forwards className on web; SVG's runtime supports this optional prop.
declare module 'react-native-svg' {
  interface SvgProps {
    className?: string;
  }
}
