"use client";

import { Modal, CloseButton } from "@/components/Modal";

// RB-25/26: app-route error boundary — a "system failure" modal with an emergency helpline.
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Modal labelledBy="error-title" onClose={reset} panelClassName="relative">
      <CloseButton onClick={reset} />
      <div className="p-8">
        <h2 id="error-title" className="text-2xl font-bold">
          Awaria systemu
        </h2>
        <p className="mt-3 text-neutral-500">
          Nastąpiła awaria systemu. Pracujemy, aby przywrócić jego działanie.
        </p>
        <hr className="my-5 border-neutral-200" />
        <p className="text-lg font-semibold">
          Jeśli potrzebujesz pilnej pomocy psychologicznej, zadzwoń:
        </p>
        <p className="mt-2 text-2xl font-bold">000 000 000</p>
      </div>
    </Modal>
  );
}
