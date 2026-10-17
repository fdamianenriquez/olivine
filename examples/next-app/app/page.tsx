// A Server Component: every Olivine component below is imported from the package and rendered
// on the server with serializable props. The interactive ones live in ./interactive.tsx.
import {
  Accordion,
  Alert,
  Badge,
  Breadcrumb,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Divider,
  Figure,
  Grid,
  Image,
  Label,
  Link,
  ListGroup,
  Nav,
  Navbar,
  Placeholder,
  Progress,
  Ratio,
  Root,
  Sheet,
  Spinner,
  Stack,
  Stat,
  Tabs,
  TabsTab,
  Text,
} from "olivine";
import { tokens } from "olivine/tokens";

import { Interactive } from "./interactive";

const PIXEL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='3'><rect width='4' height='3' fill='%23c9a77c'/></svg>";

export default function Page() {
  return (
    <Root locale="en">
      <Navbar
        brand="Olivine"
        href="#top"
        links={[
          { label: "Server", href: "#server", active: true },
          { label: "Client", href: "#client" },
        ]}
      />
      <Container>
        <main id="top" data-testid="server-page">
          <Stack gap={8}>
            <Breadcrumb items={[{ label: "Home", href: "#top" }, { label: "Smoke test" }]} />
            <Text variant="display-m" as="h1">
              Server rendering
            </Text>
            <Text tone="muted">
              Space token: {tokens.space["space-4"]}. Everything on this page is rendered on the
              server.
            </Text>

            <section id="server">
              <Divider label="Layout and content" index={1} />
              <Grid cols={3} gap={4}>
                <Col span={1}>
                  <Card
                    index={1}
                    meta="2026"
                    title="Card"
                    text="A card with a footer."
                    footer={<Badge dot>Badge</Badge>}
                  />
                </Col>
                <Col span={1}>
                  <Sheet title="Sheet" meta="Fig. 1">
                    <Stat label="Stat" value="42" unit="%" accent />
                  </Sheet>
                </Col>
                <Col span={1}>
                  <Figure index={2} caption="Figure and Ratio">
                    <Ratio ratio="4/3">
                      <Image src={PIXEL} alt="A flat swatch" />
                    </Ratio>
                  </Figure>
                </Col>
              </Grid>
              <Stack direction="h" gap={3}>
                <Button variant="accent" brackets arrow>
                  Button
                </Button>
                <ButtonGroup label="Group">
                  <Button size="s">One</Button>
                  <Button size="s">Two</Button>
                </ButtonGroup>
                <Link href="#top">Link</Link>
                <Label index="01" dot>
                  Label
                </Label>
              </Stack>
              <Alert tone="info" title="Alert">
                Rendered on the server.
              </Alert>
              <Stack gap={3}>
                <Progress label="Progress" value={60} />
                <Progress label="Indeterminate" />
                <Spinner showLabel label="Spinner" />
                <Placeholder lines={2} />
              </Stack>
              <ListGroup
                numbered
                items={[{ title: "List item", description: "With a description" }]}
              />
              <Accordion defaultOpen={[0]} items={[{ title: "Accordion", content: "Content" }]} />
              <Tabs indexed>
                <TabsTab label="One">First panel</TabsTab>
                <TabsTab label="Two">Second panel</TabsTab>
              </Tabs>
              <Nav
                label="Nav"
                items={[
                  { label: "One", href: "#top", active: true },
                  { label: "Two", href: "#top" },
                ]}
              />
            </section>

            <section id="client">
              <Divider label="Interactive components" index={2} />
              <Interactive />
            </section>
          </Stack>
        </main>
      </Container>
    </Root>
  );
}
