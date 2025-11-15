declare module "*.css";

// Shopify Polaris Web Components
declare namespace JSX {
  interface IntrinsicElements {
    's-app-nav': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    's-link': React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
    's-page': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    's-button': React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
    's-section': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    's-paragraph': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    's-box': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    's-stack': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    's-text': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    's-heading': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    's-unordered-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    's-ordered-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    's-list-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}
