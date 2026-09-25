"use client";

import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import * as yup from "yup";

import { ApiError, type ChatMessage, type MessageEdit, type OutgoingMessage } from "@/lib/api";

/** Prices stay strings: a yup.number() would make the schema's input type diverge
 *  from the form's string values and TanStack would reject it. */
const price = (label: string) =>
  yup
    .string()
    .trim()
    .matches(/^\d+(\.\d+)?$/, { message: "Enter a number", excludeEmptyString: true })
    .required(`${label} is required`);

const signalSchema = yup.object({
  symbol: yup.string().trim().required("Enter a symbol, e.g. XAUUSD"),
  direction: yup.string().oneOf(["buy", "sell"]).defined(),
  entry: price("Entry"),
  stopLoss: price("Stop loss"),
  targets: yup
    .string()
    .trim()
    .matches(/^\s*\d+(\.\d+)?\s*(,\s*\d+(\.\d+)?\s*)*$/, {
      message: "Comma-separated prices, e.g. 2440, 2465",
      excludeEmptyString: true,
    })
    .required("At least one target is required"),
  note: yup.string().trim().defined(),
});

const fieldClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand";

/**
 * A standalone instance keyed by message id in the parent, so switching which
 * message is being edited always starts from that message's own values rather
 * than whatever was left in a shared form.
 */
function EditSignalForm({
  message,
  onSave,
  onCancel,
}: {
  message: ChatMessage;
  onSave: (edit: MessageEdit) => Promise<void>;
  onCancel: () => void;
}) {
  const signal = message.signal!;
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      symbol: signal.symbol,
      direction: signal.direction,
      entry: String(signal.entry),
      stopLoss: String(signal.stopLoss),
      targets: signal.targets.join(", "),
      note: signal.note ?? "",
    },
    validators: { onChangeAsync: signalSchema, onSubmitAsync: signalSchema },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        await onSave({
          symbol: value.symbol.trim(),
          direction: value.direction,
          entry: value.entry,
          stopLoss: value.stopLoss,
          targets: value.targets,
          note: value.note.trim() || undefined,
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not save the signal");
      }
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <p className="mb-2 text-xs font-medium text-zinc-500">Editing signal</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <form.Field name="symbol">
          {(field) => (
            <div>
              <label className="text-xs text-zinc-500" htmlFor={field.name}>
                Symbol
              </label>
              <input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                className={fieldClass}
              />
              {field.state.meta.isTouched && field.state.meta.errors[0] && (
                <p className="mt-1 text-xs text-red-600">{field.state.meta.errors[0]?.message}</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="direction">
          {(field) => (
            <div>
              <span className="text-xs text-zinc-500">Direction</span>
              <div className="mt-1 flex gap-1">
                {(["buy", "sell"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => field.handleChange(option)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium capitalize transition-colors ${
                      field.state.value === option
                        ? option === "buy"
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-red-600 bg-red-50 text-red-700"
                        : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form.Field>

        {(
          [
            ["entry", "Entry"],
            ["stopLoss", "Stop loss"],
          ] as const
        ).map(([name, label]) => (
          <form.Field key={name} name={name}>
            {(field) => (
              <div>
                <label className="text-xs text-zinc-500" htmlFor={field.name}>
                  {label}
                </label>
                <input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className={fieldClass}
                />
                {field.state.meta.isTouched && field.state.meta.errors[0] && (
                  <p className="mt-1 text-xs text-red-600">{field.state.meta.errors[0]?.message}</p>
                )}
              </div>
            )}
          </form.Field>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <form.Field name="targets">
          {(field) => (
            <div>
              <label className="text-xs text-zinc-500" htmlFor={field.name}>
                Targets
              </label>
              <input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className={fieldClass}
              />
              {field.state.meta.isTouched && field.state.meta.errors[0] && (
                <p className="mt-1 text-xs text-red-600">{field.state.meta.errors[0]?.message}</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="note">
          {(field) => (
            <div>
              <label className="text-xs text-zinc-500" htmlFor={field.name}>
                Note (optional)
              </label>
              <input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className={fieldClass}
              />
            </div>
          )}
        </form.Field>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          )}
        </form.Subscribe>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function EditTextForm({
  message,
  onSave,
  onCancel,
}: {
  message: ChatMessage;
  onSave: (edit: MessageEdit) => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState(message.text ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (message.kind === "text" && !text.trim()) {
      setError("Message can't be empty");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({ text: text.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the message");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-zinc-500">
        {message.kind === "image" ? "Editing caption" : "Editing message"}
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={2}
        className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function Composer({
  onSend,
  placeholder,
  editing,
  onSaveEdit,
  onCancelEdit,
}: {
  onSend: (message: OutgoingMessage) => Promise<void>;
  placeholder: string;
  editing?: ChatMessage | null;
  onSaveEdit?: (id: string, edit: MessageEdit) => Promise<void>;
  onCancelEdit?: () => void;
}) {
  const [mode, setMode] = useState<"message" | "signal">("message");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const signalForm = useForm({
    defaultValues: {
      symbol: "",
      direction: "buy" as "buy" | "sell",
      entry: "",
      stopLoss: "",
      targets: "",
      note: "",
    },
    validators: { onChangeAsync: signalSchema, onSubmitAsync: signalSchema },
    onSubmit: async ({ value, formApi }) => {
      setError(null);

      try {
        await onSend({
          kind: "signal",
          symbol: value.symbol.trim(),
          direction: value.direction,
          entry: value.entry,
          stopLoss: value.stopLoss,
          targets: value.targets,
          note: value.note.trim() || undefined,
        });
        formApi.reset();
        setMode("message");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not send the signal");
      }
    },
  });

  async function sendMessage() {
    if (sending) return;
    setError(null);
    setSending(true);

    try {
      if (file) {
        await onSend({ kind: "image", file, text: text.trim() || undefined });
      } else {
        await onSend({ kind: "text", text: text.trim() });
      }

      setText("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the message");
    } finally {
      setSending(false);
    }
  }

  const canSend = (text.trim().length > 0 || file !== null) && !sending;

  if (editing && onSaveEdit && onCancelEdit) {
    const save = (edit: MessageEdit) => onSaveEdit(editing.id, edit);

    return (
      <div className="border-t border-zinc-200 bg-white p-3">
        {editing.kind === "signal" ? (
          <EditSignalForm key={editing.id} message={editing} onSave={save} onCancel={onCancelEdit} />
        ) : (
          <EditTextForm key={editing.id} message={editing} onSave={save} onCancel={onCancelEdit} />
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-200 bg-white p-3">
      <div className="mb-2 flex gap-1">
        {(["message", "signal"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setMode(option)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
              mode === option ? "bg-brand text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {mode === "message" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={2}
              placeholder={placeholder}
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
            />
            {file && (
              <p className="mt-1 text-xs text-zinc-500">
                {file.name}
                <button
                  onClick={() => {
                    setFile(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  className="ml-2 text-red-600 hover:underline"
                >
                  remove
                </button>
              </p>
            )}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Image
          </button>
          <button
            onClick={sendMessage}
            disabled={!canSend}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            signalForm.handleSubmit();
          }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <signalForm.Field name="symbol">
              {(field) => (
                <div>
                  <label className="text-xs text-zinc-500" htmlFor={field.name}>
                    Symbol
                  </label>
                  <input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                    placeholder="XAUUSD"
                    className={fieldClass}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors[0] && (
                    <p className="mt-1 text-xs text-red-600">{field.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            </signalForm.Field>

            <signalForm.Field name="direction">
              {(field) => (
                <div>
                  <span className="text-xs text-zinc-500">Direction</span>
                  <div className="mt-1 flex gap-1">
                    {(["buy", "sell"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => field.handleChange(option)}
                        className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium capitalize transition-colors ${
                          field.state.value === option
                            ? option === "buy"
                              ? "border-green-600 bg-green-50 text-green-700"
                              : "border-red-600 bg-red-50 text-red-700"
                            : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </signalForm.Field>

            {(
              [
                ["entry", "Entry", "2412.5"],
                ["stopLoss", "Stop loss", "2398"],
              ] as const
            ).map(([name, label, hint]) => (
              <signalForm.Field key={name} name={name}>
                {(field) => (
                  <div>
                    <label className="text-xs text-zinc-500" htmlFor={field.name}>
                      {label}
                    </label>
                    <input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder={hint}
                      className={fieldClass}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors[0] && (
                      <p className="mt-1 text-xs text-red-600">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </signalForm.Field>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <signalForm.Field name="targets">
              {(field) => (
                <div>
                  <label className="text-xs text-zinc-500" htmlFor={field.name}>
                    Targets
                  </label>
                  <input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="2440, 2465"
                    className={fieldClass}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors[0] && (
                    <p className="mt-1 text-xs text-red-600">{field.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            </signalForm.Field>

            <signalForm.Field name="note">
              {(field) => (
                <div>
                  <label className="text-xs text-zinc-500" htmlFor={field.name}>
                    Note (optional)
                  </label>
                  <input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Risk 1% per trade"
                    className={fieldClass}
                  />
                </div>
              )}
            </signalForm.Field>
          </div>

          <signalForm.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
              >
                {isSubmitting ? "Posting…" : "Post signal"}
              </button>
            )}
          </signalForm.Subscribe>
        </form>
      )}
    </div>
  );
}
