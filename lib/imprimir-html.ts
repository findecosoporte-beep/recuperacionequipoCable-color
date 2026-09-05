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

export function imprimirHtml(html: string): boolean {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Imprimir acuse");
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

  void esperarImagenes(doc).then(() => {
    win.focus();
    win.print();
    window.setTimeout(() => iframe.remove(), 1500);
  });

  return true;
}
