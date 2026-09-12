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
`;

export const AdminLoginWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
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

    &.active {
      background-color: #e31f71;
      border-color: #e31f71;
      color: #fff;
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
`;

export const AdminTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 1.4rem;

  th,
  td {
    text-align: left;
    padding: 1rem 1.2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    vertical-align: top;
  }

  th {
    font-weight: 600;
    opacity: 0.8;
  }

  td.actions {
    display: flex;
    gap: 0.8rem;

    button {
      padding: 0.6rem 1.2rem;
      font-size: 1.3rem;
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
  }

  textarea {
    min-height: 9rem;
    resize: vertical;
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
`;

export const AdminStatus = styled.div`
  padding: 2rem 0;
  opacity: 0.75;
  font-size: 1.4rem;
`;
