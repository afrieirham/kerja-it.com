import { Form } from "react-router";

export function PaginationButton({
  q,
  page,
  itemLength,
}: {
  q: string;
  page: number;
  itemLength: number;
}) {
  if (itemLength === 0) return null;

  return (
    <div className="flex flex-row-reverse items-center justify-between text-sm">
      <div className="flex gap-4">
        <Form>
          {q && <input type="hidden" name="q" value={q} />}
          <input type="hidden" name="p" value={page - 1} />

          <button
            type="submit"
            disabled={page === 1}
            className="cursor-pointer hover:underline disabled:hover:no-underline disabled:cursor-not-allowed disabled:text-gray-300"
          >
            prev
          </button>
        </Form>
        <Form>
          {q && <input type="hidden" name="q" value={q} />}
          <input type="hidden" name="p" value={page + 1} />

          <button
            type="submit"
            disabled={itemLength !== 50}
            className="cursor-pointer hover:underline disabled:hover:no-underline disabled:cursor-not-allowed disabled:text-gray-300"
          >
            next
          </button>
        </Form>
      </div>
      <p className="text-black">Total {itemLength}</p>
    </div>
  );
}
