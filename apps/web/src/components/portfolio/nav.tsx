'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BRAND } from '@learn/ui';
import { LogoMark } from '@/components/logo-mark';
import { NAV } from '@/content/portfolio';
import { useLang } from '@/lib/portfolio-language';
import { LanguageToggle } from './language-toggle';

export function PortfolioNav() {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const items = NAV.map((n) => ({ href: n.href, label: n.label[lang] }));
  const loginLabel = lang === 'vi' ? 'Đăng nhập' : 'Login';

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-surface-100 sm:px-6">
        <Link href="#home" className="shrink-0">
          <span className="inline-flex items-center gap-2">
            <LogoMark size={28} tone="dark" />
            <span className="font-semibold">{BRAND.name}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-surface-100/80 md:flex">
          {items.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-surface-100">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageToggle />
          <Link
            href="/login"
            className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-semibold text-navy-900 hover:bg-sky-400"
          >
            {loginLabel}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="grid size-9 place-items-center rounded-lg border border-white/15 md:hidden"
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-3 pt-3 text-sm font-medium text-surface-100/85">
            {items.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between">
            <LanguageToggle />
            <Link
              href="/login"
              className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-semibold text-navy-900"
            >
              {loginLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
