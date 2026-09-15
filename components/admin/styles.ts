import styled from "styled-components";

export const AdminRoot = styled.div`
  min-height: 100vh;
  background-color: #212121;
  color: #fff;
  font-family: "Red Hat Display", sans-serif;
  font-size: 14px;

  &.light {
    background-color: #f5f5f5;
    color: #212121;
  }

  @media (max-width: 640px) {
    font-size: 13px;
  }
`;

/** Page padding for the admin dashboard (drop-in replacement for AdminRoot). */
export const AdminPage = styled(AdminRoot)`
  padding: 8rem 2rem 4rem;

  @media (max-width: 900px) {
    padding: 5rem 1.6rem 3rem;
  }

  @media (max-width: 640px) {
    padding: 3.2rem 1.4rem 2.4rem;
  }
`;

export const AdminLoginWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;

  @media (max-width: 640px) {
    align-items: flex-start;
    padding: 1.6rem;
    padding-top: 8vh;
  }
`;

export const AdminCard = styled.div`
  width: 100%;
  max-width: 420px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1.6rem;
  padding: 3.2rem;

  h1 {
    font-size: 2.4rem;
    margin-bottom: 0.8rem;
  }

  p.sub {
    opacity: 0.7;
    margin-bottom: 2.4rem;
    font-size: 1.4rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
  }

  button[type="submit"] {
    margin-top: 0.8rem;
    padding: 1.2rem;
    font-size: 1.5rem;
    border: none;
    border-radius: 2rem;
    background-color: #016fb9;
    color: #fff;
    cursor: pointer;
    font-weight: 500;
  }

  button[type="submit"]:disabled {
    filter: brightness(0.6);
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    padding: 2.4rem 1.8rem;
    border-radius: 1.2rem;

    h1 {
      font-size: 2rem;
    }
  }
`;

export const AdminField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-size: 1.4rem;

  input {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 0.8rem;
    padding: 1.1rem 1.2rem;
    color: inherit;
    font-size: 1.5rem;
    font-family: inherit;
    outline: none;
    width: 100%;
  }

  /* 16px+ prevents iOS Safari from zooming on focus. */
  @media (max-width: 640px) {
    input {
      font-size: 16px;
    }
  }
`;

export const AdminError = styled.div`
  background-color: rgba(227, 31, 113, 0.15);
  border: 1px solid #e31f71;
  color: #e31f71;
  border-radius: 0.8rem;
  padding: 1rem 1.2rem;
  font-size: 1.4rem;
  margin-bottom: 1.6rem;
`;

export const AdminHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.6rem;
  margin-bottom: 2.4rem;
  flex-wrap: wrap;

  h1 {
    font-size: 2.6rem;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    font-size: 1.4rem;

    a {
      color: #4b8bbe;
    }
  }

  button {
    padding: 0.9rem 1.6rem;
    font-size: 1.4rem;
    border: none;
    border-radius: 2rem;
    background-color: #016fb9;
    color: #fff;
    cursor: pointer;
  }

  @media (max-width: 640px) {
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.8rem;

    h1 {
      font-size: 2rem;
    }

    .actions {
      width: 100%;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.8rem;
    }
  }
`;

export const AdminTabBar = styled.nav`
  display: flex;
  gap: 0.6rem;
  margin-bottom: 2.4rem;
  flex-wrap: wrap;

  button {
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 2rem;
    padding: 0.8rem 1.6rem;
    font-size: 1.4rem;
    color: inherit;
    cursor: pointer;
    white-space: nowrap;

    &.active {
      background-color: #e31f71;
      border-color: #e31f71;
      color: #fff;
    }
  }

  /* On small screens turn the tab strip into a single scrollable row so the
     tabs never wrap into a tall stack or overflow the viewport. Capping the
     width keeps the strip exactly as wide as its container. */
  @media (max-width: 720px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    width: 100%;
    max-width: 100%;
    margin-bottom: 1.8rem;
    padding-bottom: 0.8rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    /* A soft fade on the right edge signals that more tabs scroll into view. */
    mask-image: linear-gradient(to right, #000 0, #000 92%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, #000 0, #000 92%, transparent 100%);

    &::-webkit-scrollbar {
      display: none;
    }

    button {
      flex: 0 0 auto;
      padding: 0.7rem 1.3rem;
      font-size: 1.3rem;
    }
  }
`;

export const AdminPanel = styled.section`
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.2rem;
  padding: 2rem;

  h2 {
    font-size: 2rem;
    margin-bottom: 1.6rem;
  }

  @media (max-width: 640px) {
    padding: 1.4rem 1.2rem;
    border-radius: 1rem;

    h2 {
      font-size: 1.7rem;
      margin-bottom: 1.2rem;
    }
  }
`;

export const AdminToolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.6rem;

  button {
    padding: 0.9rem 1.6rem;
    font-size: 1.4rem;
    border: none;
    border-radius: 2rem;
    background-color: #016fb9;
    color: #fff;
    cursor: pointer;
  }

  @media (max-width: 640px) {
    button {
      width: 100%;
      padding: 1.1rem 1.6rem;
    }
  }
`;

/**
 * Horizontal scroll container for the table. On tablet widths the table stays
 * tabular but scrolls sideways instead of squashing or overflowing the page.
 */
export const AdminTableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

export const AdminTable = styled.table`
  /* Auto layout so each column gets the width it needs and the reserved
     Actions width is respected. The min-width keeps the table filling the
     panel when the content is narrow; the scroll wrapper handles any overflow
     rather than clipping the last column. */
  width: auto;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 1.4rem;
  table-layout: auto;

  th,
  td {
    text-align: left;
    padding: 1rem 1.2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    vertical-align: top;
    /* Break long unbroken strings (URLs, etc.) instead of overflowing. */
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  th {
    font-weight: 600;
    opacity: 0.8;
    /* Column headings must always read as a single line: never wrap, and
       never break inside a word ("Live URL" -> "Live\nURL"). */
    white-space: nowrap;
    overflow-wrap: normal;
    word-break: normal;
  }

  /* The Actions column holds two buttons side by side. The width is reserved
     on the header and the cell together so the fixed layout gives this column
     real space instead of squeezing it to a few pixels. The cell must stay a
     table-cell: switching it to flex would drop it out of the table layout and
     break the row border alignment. */
  th:last-child,
  td.actions {
    width: 190px;
    white-space: nowrap;
    overflow-wrap: normal;
    word-break: normal;
  }

  td.actions {
    /* Inner flex row keeps the buttons laid out without taking the cell out
       of the table. */
    > .actions-inner {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    button {
      flex: 0 0 auto;
      padding: 0.6rem 1.2rem;
      font-size: 1.3rem;
      white-space: nowrap;
      border: none;
      border-radius: 2rem;
      background-color: #016fb9;
      color: #fff;
      cursor: pointer;
    }

    button.danger {
      background-color: #e31f71;
    }
  }

  /* Narrow tablet/small-laptop: keep the tabular layout readable by scrolling
     sideways, but never in the phone range where we switch to cards. */
  @media (min-width: 641px) and (max-width: 900px) {
    min-width: 720px;
  }

  /*
   * Phone layout: collapse the table into stacked cards. Each cell shows its
   * column name from the data-label attribute set in the component.
   */
  @media (max-width: 640px) {
    /* The table stops being a table here and becomes a plain stack of cards,
       so it must size to its container rather than to its content. */
    display: block;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    font-size: 1.4rem;
    table-layout: auto;

    thead {
      display: none;
    }

    tbody,
    tr,
    td {
      display: block;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    tr {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 1rem;
      padding: 0.6rem 1.2rem;
      margin-bottom: 1.2rem;
      background-color: rgba(255, 255, 255, 0.03);
      /* Constrain the card to its container so long unbroken values cannot
         stretch it past the viewport. */
      overflow: hidden;
    }

    /* Stack the label above its value. A side-by-side pair cannot work at
       phone widths: a label like "Description" plus the gap leaves too little
       room for the value, forcing mid-word breaks. Stacking gives the value
       the full cell width. */
    td {
      border-bottom: none;
      padding: 0.7rem 0;
      display: block;
      /* Wrap whole words first; only break inside a word (a long URL) when
         there is no other choice. */
      overflow-wrap: break-word;
      word-break: normal;

      /* Column name, shown as a small heading above the value. */
      &::before {
        content: attr(data-label);
        display: block;
        font-weight: 600;
        font-size: 1.1rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        opacity: 0.55;
        margin-bottom: 0.25rem;
      }
    }

    td.actions {
      /* In the card layout there is no table alignment to preserve, so the
         cell can lay out its buttons directly. The reserved desktop width and
         nowrap must be cleared so the buttons span the card. */
      width: auto;
      min-width: 0;
      white-space: normal;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 0.4rem;
      padding-top: 1rem;

      &::before {
        content: none;
      }

      > .actions-inner {
        justify-content: flex-end;
        gap: 0.8rem;
      }

      button {
        flex: 1 1 auto;
        padding: 0.8rem 1.2rem;
      }
    }
  }
`;

export const AdminModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 6rem 2rem;
  overflow-y: auto;
  z-index: 50;
  -webkit-overflow-scrolling: touch;

  /* On phones the dialog behaves like a full-height sheet. */
  @media (max-width: 640px) {
    padding: 0;
    align-items: stretch;
  }
`;

export const AdminModalCard = styled.div`
  width: 100%;
  max-width: 640px;
  background-color: #212121;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1.2rem;
  padding: 2.4rem;

  h2 {
    font-size: 2rem;
    margin-bottom: 1.8rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
  }

  input,
  textarea,
  select {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 0.8rem;
    padding: 1rem 1.2rem;
    color: inherit;
    font-size: 1.4rem;
    font-family: inherit;
    width: 100%;
    outline: none;
    max-width: 100%;
  }

  textarea {
    min-height: 9rem;
    resize: vertical;
  }

  /* Multi-line list fields (e.g. accomplishments, techList) need room for a
     realistic number of entries. Where supported the box grows to fit its
     content; elsewhere the taller min-height applies. */
  textarea[rows="8"] {
    min-height: 17rem;
    field-sizing: content;
    max-height: 40rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 0.8rem;

    button {
      padding: 1rem 1.8rem;
      font-size: 1.4rem;
      border: none;
      border-radius: 2rem;
      background-color: #016fb9;
      color: #fff;
      cursor: pointer;
    }

    button.cancel {
      background-color: transparent;
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: inherit;
    }
  }

  @media (max-width: 640px) {
    max-width: none;
    min-height: 100vh;
    border: none;
    border-radius: 0;
    padding: 1.8rem 1.4rem 2.4rem;

    h2 {
      font-size: 1.8rem;
      margin-bottom: 1.4rem;
    }

    /* 16px stops iOS Safari from zooming the viewport on focus. */
    input,
    textarea,
    select {
      font-size: 16px;
    }

    .modal-actions {
      position: sticky;
      bottom: 0;
      padding-top: 1.2rem;
      padding-bottom: 0.4rem;
      background-color: #212121;

      button {
        flex: 1 1 auto;
        padding: 1.1rem 1.4rem;
      }
    }
  }
`;

export const AdminStatus = styled.div`
  padding: 2rem 0;
  opacity: 0.75;
  font-size: 1.4rem;

  @media (max-width: 640px) {
    padding: 1.4rem 0;
  }
`;

/** A labelled form field used by the profile editor and resource modals. */
export const AdminFormField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 1.3rem;

  input,
  textarea,
  select {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 0.8rem;
    padding: 1rem 1.2rem;
    color: inherit;
    font-size: 1.4rem;
    font-family: inherit;
    width: 100%;
    max-width: 100%;
    outline: none;
  }

  textarea {
    min-height: 9rem;
    resize: vertical;
  }

  @media (max-width: 640px) {
    /* 16px stops iOS Safari from zooming the viewport on focus. */
    input,
    textarea,
    select {
      font-size: 16px;
    }
  }
`;

/** Primary action button used across the admin UI. */
export const AdminButton = styled.button`
  padding: 1rem 1.8rem;
  font-size: 1.4rem;
  font-family: inherit;
  border: none;
  border-radius: 2rem;
  background-color: #016fb9;
  color: #fff;
  cursor: pointer;

  &:disabled {
    filter: brightness(0.6);
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    padding: 1.1rem 1.4rem;
  }
`;

/** The profile editor's form grid. */
export const AdminFormGrid = styled.form`
  display: grid;
  gap: 1.4rem;
  max-width: 560px;
  width: 100%;

  @media (max-width: 640px) {
    max-width: none;
    gap: 1.1rem;
  }
`;

/** A plain-text toggle (e.g. "Show password"). */
export const AdminTextButton = styled.button`
  background: transparent;
  border: none;
  color: inherit;
  opacity: 0.7;
  padding: 0;
  font-size: 1.3rem;
  font-family: inherit;
  width: fit-content;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
`;
