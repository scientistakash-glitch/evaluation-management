// Override SLDS Input type to accept proper onChange signature
declare module '@salesforce/design-system-react/components/input' {
  import React from 'react';
  interface InputProps {
    id?: string;
    label?: string;
    value?: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    errorText?: string;
    onChange?: (e: any, data: { value: string }) => void;
    onBlur?: (e: any) => void;
    onFocus?: (e: any) => void;
    onClick?: (e: any) => void;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
  }
  const Input: React.ComponentType<InputProps>;
  export default Input;
}

declare module '@salesforce/design-system-react/components/textarea' {
  import React from 'react';
  interface TextareaProps {
    id?: string;
    label?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    errorText?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    [key: string]: any;
  }
  const Textarea: React.ComponentType<TextareaProps>;
  export default Textarea;
}

declare module '@salesforce/design-system-react/components/modal' {
  import React from 'react';
  interface ModalProps {
    isOpen?: boolean;
    heading?: string;
    onRequestClose?: () => void;
    size?: string;
    footer?: React.ReactNode[];
    prompt?: string;
    children?: React.ReactNode;
    [key: string]: any;
  }
  const Modal: React.ComponentType<ModalProps>;
  export default Modal;
}

declare module '@salesforce/design-system-react/components/button' {
  import React from 'react';
  interface ButtonProps {
    label?: string;
    variant?: string;
    onClick?: (e?: any) => void;
    disabled?: boolean;
    iconCategory?: string;
    iconName?: string;
    iconPosition?: string;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
  }
  const Button: React.ComponentType<ButtonProps>;
  export default Button;
}

declare module '@salesforce/design-system-react/components/spinner' {
  import React from 'react';
  interface SpinnerProps {
    size?: string;
    variant?: string;
    [key: string]: any;
  }
  const Spinner: React.ComponentType<SpinnerProps>;
  export default Spinner;
}

declare module '@salesforce/design-system-react/components/card' {
  import React from 'react';
  interface CardProps {
    heading?: string;
    children?: React.ReactNode;
    headerActions?: React.ReactNode;
    className?: string;
    [key: string]: any;
  }
  const Card: React.ComponentType<CardProps>;
  export default Card;
}

declare module '@salesforce/design-system-react/components/page-header' {
  import React from 'react';
  interface PageHeaderProps {
    label?: string;
    title?: string;
    variant?: string;
    onRenderActions?: () => React.ReactNode;
    children?: React.ReactNode;
    [key: string]: any;
  }
  const PageHeader: React.ComponentType<PageHeaderProps>;
  export default PageHeader;
}

declare module '@salesforce/design-system-react/components/data-table' {
  import React from 'react';
  interface DataTableProps {
    id?: string;
    items?: any[];
    children?: React.ReactNode;
    [key: string]: any;
  }
  const DataTable: React.ComponentType<DataTableProps>;
  export default DataTable;
}

declare module '@salesforce/design-system-react/components/data-table/column' {
  import React from 'react';
  interface DataTableColumnProps {
    label?: string;
    property?: string;
    primaryColumn?: boolean;
    children?: React.ReactElement;
    sortable?: boolean;
    width?: string;
    [key: string]: any;
  }
  const DataTableColumn: React.ComponentType<DataTableColumnProps>;
  export default DataTableColumn;
}

declare module '@salesforce/design-system-react/components/data-table/cell' {
  import React from 'react';
  interface DataTableCellProps {
    item?: Record<string, any>;
    property?: string;
    primaryColumn?: boolean;
    children?: React.ReactNode;
    className?: string;
    [key: string]: any;
  }
  const DataTableCell: React.ComponentType<DataTableCellProps> & { displayName: string };
  export default DataTableCell;
}

declare module '@salesforce/design-system-react/components/data-table/row-actions' {
  import React from 'react';
  interface DataTableRowActionsProps {
    options?: Array<{ label: string; value: string }>;
    onAction?: (item: any, action: { value: string }) => void;
    [key: string]: any;
  }
  const DataTableRowActions: React.ComponentType<DataTableRowActionsProps>;
  export default DataTableRowActions;
}

declare module '@salesforce/design-system-react/components/tabs' {
  import React from 'react';
  interface TabsProps {
    id?: string;
    selectedIndex?: number;
    onSelect?: (index: number) => void;
    children?: React.ReactNode;
    [key: string]: any;
  }
  const Tabs: React.ComponentType<TabsProps>;
  export default Tabs;
}

declare module '@salesforce/design-system-react/components/tabs/panel' {
  import React from 'react';
  interface TabsPanelProps {
    label?: string;
    children?: React.ReactNode;
    [key: string]: any;
  }
  const TabsPanel: React.ComponentType<TabsPanelProps>;
  export default TabsPanel;
}

declare module '@salesforce/design-system-react/components/icon-settings' {
  import React from 'react';
  interface IconSettingsProps {
    iconPath?: string;
    children?: React.ReactNode;
    [key: string]: any;
  }
  const IconSettings: React.ComponentType<IconSettingsProps>;
  export default IconSettings;
}

declare module '@salesforce/design-system-react/components/toast' {
  import React from 'react';
  interface ToastProps {
    labels?: { heading?: string; details?: string; [key: string]: any };
    variant?: string;
    onRequestClose?: () => void;
    [key: string]: any;
  }
  const Toast: React.ComponentType<ToastProps>;
  export default Toast;
}

declare module '@salesforce/design-system-react/components/toast/container' {
  import React from 'react';
  interface ToastContainerProps {
    children?: React.ReactNode;
    [key: string]: any;
  }
  const ToastContainer: React.ComponentType<ToastContainerProps>;
  export default ToastContainer;
}

declare module '@salesforce/design-system-react/components/badge' {
  import React from 'react';
  interface BadgeProps {
    id?: string;
    color?: string;
    content?: string;
    [key: string]: any;
  }
  const Badge: React.ComponentType<BadgeProps>;
  export default Badge;
}

declare module '@salesforce/design-system-react/components/progress-bar' {
  import React from 'react';
  interface ProgressBarProps {
    id?: string;
    value?: number;
    color?: string;
    size?: string;
    [key: string]: any;
  }
  const ProgressBar: React.ComponentType<ProgressBarProps>;
  export default ProgressBar;
}
