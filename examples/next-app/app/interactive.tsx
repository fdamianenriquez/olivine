"use client";

import {
  Button,
  Carousel,
  Checkbox,
  CheckGroup,
  CloseButton,
  Dropdown,
  Field,
  FileInput,
  Input,
  InputGroup,
  InputGroupText,
  Modal,
  Offcanvas,
  Pagination,
  Popover,
  Radio,
  Range,
  Select,
  Stack,
  Switch,
  Table,
  Textarea,
  Toast,
  ToastProvider,
  ToastStack,
  Tooltip,
  useToast,
} from "olivine";
import { useState } from "react";

interface Row {
  name: string;
  price: number;
}

const ROWS: Row[] = [
  { name: "Alder", price: 0 },
  { name: "Ash", price: 20000 },
];

function Controls() {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [panel, setPanel] = useState(false);
  const [page, setPage] = useState(1);
  return (
    <Stack gap={6}>
      <Stack direction="h" gap={3}>
        <Button
          onClick={() => {
            setModal(true);
          }}
        >
          Open modal
        </Button>
        <Button
          onClick={() => {
            setPanel(true);
          }}
        >
          Open panel
        </Button>
        <Button
          onClick={() => {
            toast.show({ tone: "success", title: "Saved", description: "A toast from the hook." });
          }}
        >
          Show toast
        </Button>
        <Dropdown
          label="Dropdown"
          items={[{ header: "Menu" }, { label: "One" }, { label: "Two" }]}
        />
        <Tooltip content="A tooltip">
          <Button>Tooltip</Button>
        </Tooltip>
        <Popover title="Popover" content="Popover content" trigger={<Button>Popover</Button>} />
        <CloseButton />
      </Stack>

      <Field label="Name" hint="Field, Input" required>
        <Input />
      </Field>
      <Field label="Service">
        <Select options={["One", "Two"]} />
      </Field>
      <Field label="Notes">
        <Textarea />
      </Field>
      <Field label="Budget" aside="Range">
        <Range min={0} max={10} defaultValue={4} format={(v) => `${String(v)}k`} />
      </Field>
      <InputGroup>
        <Input aria-label="Size" />
        <InputGroupText>m</InputGroupText>
      </InputGroup>
      <CheckGroup legend="CheckGroup">
        <Checkbox label="Checkbox" />
        <Radio name="r" label="Radio" defaultChecked />
        <Radio name="r" label="Other" />
      </CheckGroup>
      <Switch label="Switch" />
      <FileInput label="Files" hint="FileInput" />

      <Table<Row>
        caption="Table"
        columns={[
          { key: "name", label: "Name", sortable: true },
          { key: "price", label: "Price", numeric: true, render: (r) => `¥${String(r.price)}` },
        ]}
        rows={ROWS}
      />
      <Pagination total={5} page={page} onChange={setPage} />
      <Carousel label="Carousel" slides={["One", "Two", "Three"]} />

      <Toast tone="info" title="Toast" meta="Static">
        A toast outside a stack.
      </Toast>
      <ToastStack position="static" />

      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
        }}
        title="Modal"
        footer={
          <Button
            onClick={() => {
              setModal(false);
            }}
          >
            Done
          </Button>
        }
      >
        Modal body
      </Modal>
      <Offcanvas
        open={panel}
        onClose={() => {
          setPanel(false);
        }}
        title="Offcanvas"
      >
        Offcanvas body
      </Offcanvas>
    </Stack>
  );
}

export function Interactive() {
  return (
    <ToastProvider position="br">
      <Controls />
    </ToastProvider>
  );
}
