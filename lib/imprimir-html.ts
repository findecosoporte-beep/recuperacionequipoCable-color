"use client";

function esperarImagenes(doc: Document): Promise<void> {
  const imagenes = Array.from(doc.images);
  if (imagenes.length === 0 || imagenes.every((img) => img.complete)) {
    return Promise.resolve();
  }

  return Promise.all(
    imagenes.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  ).then(() => undefined);
}

function imprimirEnDocumento(doc: Document, win: Window) {
  doc.title = "Acuse de Recibo";
  void esperarImagenes(doc).then(() => {
    win.focus();
    win.print();
  });
}

export function imprimirHtml(html: string): boolean {
  const ventana = window.open("about:blank", "acuse-recibo");
  if (ventana) {
    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
    imprimirEnDocumento(ventana.document, ventana);
    ventana.addEventListener("afterprint", () => ventana.close());
    return true;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Acuse de Recibo");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();
  imprimirEnDocumento(doc, win);
  win.addEventListener("afterprint", () => iframe.remove());
  window.setTimeout(() => iframe.remove(), 60_000);
  return true;
}
