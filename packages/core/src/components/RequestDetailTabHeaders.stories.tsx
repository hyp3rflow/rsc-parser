import React from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { RequestDetailTabHeaders } from "./RequestDetailTabHeaders";
import { alvarDevExampleData } from "../example-data/alvar-dev";
import { ghFredkissDevExampleData } from "../example-data/gh-fredkiss-dev";
import { nextjsOrgExampleData } from "../example-data/nextjs-org";

const meta: Meta<typeof RequestDetailTabHeaders> = {
  component: RequestDetailTabHeaders,
};

export default meta;
type Story = StoryObj<typeof RequestDetailTabHeaders>;

export const alvarDev: Story = {
  name: "alvar.dev",
  render: () => {
    return <RequestDetailTabHeaders events={alvarDevExampleData} />;
  },
};

export const ghFredKissDev: Story = {
  name: "gh.fredkiss.dev",
  render: () => {
    return <RequestDetailTabHeaders events={ghFredkissDevExampleData} />;
  },
};

export const nextjsOrg: Story = {
  name: "nextjs.org",
  render: () => {
    return <RequestDetailTabHeaders events={nextjsOrgExampleData} />;
  },
};
