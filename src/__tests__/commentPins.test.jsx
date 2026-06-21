import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CommentPins from "../components/CommentPins.jsx";
import { addCommentPin, newCommentPin, newShow } from "../domain/show.js";
import { feetToMm } from "../domain/units.js";

function seedCommentDoc() {
  let doc = newShow({ name: "Comment Test" });
  const pin = newCommentPin({ xMm: feetToMm(2), yMm: feetToMm(-1), text: "Check sightline" });
  doc = addCommentPin(doc, pin);
  return { doc, pin };
}

describe("CommentPins", () => {
  it("lists comment pins and selects a row", () => {
    const { doc, pin } = seedCommentDoc();
    const onSelectCommentPin = vi.fn();
    render(React.createElement(CommentPins, {
      doc,
      selectedCommentPinId: null,
      onSelectCommentPin,
      onChange: vi.fn(),
      onDelete: vi.fn(),
    }));

    fireEvent.click(screen.getByRole("button", { name: /Check sightline/ }));

    expect(onSelectCommentPin).toHaveBeenCalledWith(pin.id);
  });

  it("edits and deletes the selected pin", () => {
    const { doc, pin } = seedCommentDoc();
    const onChange = vi.fn();
    const onDelete = vi.fn();
    render(React.createElement(CommentPins, {
      doc,
      selectedCommentPinId: pin.id,
      onSelectCommentPin: vi.fn(),
      onChange,
      onDelete,
    }));

    const note = screen.getByLabelText("Selected note");
    fireEvent.change(note, { target: { value: "Move upstage" } });
    fireEvent.blur(note);
    fireEvent.click(screen.getByRole("button", { name: "Delete pin" }));

    expect(onChange).toHaveBeenCalledWith(pin.id, { text: "Move upstage" });
    expect(onDelete).toHaveBeenCalledWith(pin.id);
  });
});
