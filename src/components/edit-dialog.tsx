"use client";

import { usePathname, useRouter } from "next/navigation";
import { cloneElement, isValidElement, useEffect, useState, type ReactElement } from "react";

export function EditDialog({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactElement<{ onCancel?: () => void }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(defaultOpen);

  function close() {
    setOpen(false);
    if (defaultOpen) router.replace(pathname);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
    // O fechamento usa o estado atual do diálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button className="btn" type="button" onClick={() => setOpen(true)}>Editar</button>
      {open && isValidElement(children) ? (
        <div className="modal-backdrop" onMouseDown={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            className="edit-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="edit-modal-head">
              <h2 id="edit-title">{title}</h2>
              <button className="edit-modal-close" type="button" aria-label="Fechar" onClick={close}>×</button>
            </div>
            {cloneElement(children, { onCancel: close })}
          </div>
        </div>
      ) : null}
    </>
  );
}
