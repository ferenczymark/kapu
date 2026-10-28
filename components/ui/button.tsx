import { ButtonHTMLAttributes, ReactNode } from 'react';

// 1. MEGHATÁROZZUK A GOMB PROPS-OKAT (Milyen beállításai lehetnek?)
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger'; // A gomb stílusváltozatai
  size?: 'sm' | 'md' | 'lg';                     // A gomb méretei
}

export default function Button({
  children,
  variant = 'primary', // Alapértelmezett a fő dizájn
  size = 'md',        // Alapértelmezett a közepes méret
  className = '',      // Lehetőséget adunk egyedi Tailwind osztályok hozzáadására is
  ...props             // Minden más alapértelmezett gomb tulajdonság (pl. onClick, disabled, type)
}: ButtonProps) {
  
  // Alap stílusok, amik MINDEN gombra érvényesek (lekerekítés, betűtípus, sima átmenet, igazítás)
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none';

  // 2. STÍLUSVÁLTOZATOK (Variants) TÉRKÉPE
  const variants = {
    primary: 'bg-teal-600 hover:bg-teal-500 text-slate-100 focus:ring-teal-500 shadow-lg shadow-teal-900/20',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 focus:ring-slate-600',
    danger: 'bg-rose-600 hover:bg-rose-500 text-slate-100 focus:ring-rose-500 shadow-lg shadow-rose-900/20',
  };

  // 3. MÉRETEK (Sizes) TÉRKÉPE
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };

  // Összefűzzük a kiválasztott stílusokat
  const computedClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button className={computedClasses} {...props}>
      {children}
    </button>
  );
}