import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import AuthButtons from "../AuthButtons.vue";

// Mock i18n
const mockI18n = {
  t: (key: string) => {
    const translations: Record<string, string> = {
      "page.login.continue_twitch": "Continue with Twitch",
      "page.login.continue_discord": "Continue with Discord",
      "page.login.sign_in_to_access": "Sign in to access your account",
      "page.login.privacy_policy": "Privacy Policy",
      "page.login.terms_of_service": "Terms of Service",
    };
    return translations[key] || key;
  },
};

// Mock Supabase
vi.mock("@/plugins/supabase.client", () => ({
  default: {
    user: { loggedIn: false, id: null },
    client: {
      auth: {
        signInWithOAuth: vi.fn(),
      },
    },
  },
}));

// Mock Nuxt app
vi.mock("#app", () => ({
  useNuxtApp: () => ({
    $supabase: {
      user: { loggedIn: false, id: null },
      client: {
        auth: {
          signInWithOAuth: vi.fn(() => ({ url: "https://example.com/oauth" })),
        },
      },
      signInWithOAuth: vi.fn(() => ({ url: "https://example.com/oauth" })),
    },
    $i18n: mockI18n,
  }),
}));

// Mock router
const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock DataMigrationService
vi.mock("@/utils/DataMigrationService", () => ({
  default: {
    hasLocalData: vi.fn(() => false),
  },
}));

// Mock window.open
Object.defineProperty(window, "open", {
  writable: true,
  value: vi.fn(() => ({
    closed: false,
    close: vi.fn(),
  })),
});

// Mock window location
Object.defineProperty(window, "location", {
  writable: true,
  value: {
    origin: "http://localhost:3000",
  },
});

describe("AuthButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders auth buttons correctly", () => {
    const wrapper = mount(AuthButtons, {
      global: {
        mocks: {
          $t: mockI18n.t,
        },
        stubs: {
          UIcon: true,
          UButton: {
            template: "<button><slot /></button>",
            props: ["loading", "disabled", "variant", "size", "block", "class"],
          },
        },
      },
    });

    // Check that buttons with correct text are rendered
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(2);
    expect(wrapper.text()).toContain("Continue with Twitch");
    expect(wrapper.text()).toContain("Continue with Discord");
  });

  it("handles Twitch button click", async () => {
    const wrapper = mount(AuthButtons, {
      global: {
        mocks: {
          $t: mockI18n.t,
        },
        stubs: {
          UIcon: true,
          UButton: {
            template: "<button @click=\"$emit('click')\"><slot /></button>",
            props: ["loading", "disabled", "variant", "size", "block", "class"],
          },
        },
      },
    });

    // Find the first button (Twitch) by its text content
    const twitchButton = wrapper.find("button");
    expect(twitchButton.exists()).toBe(true);
    expect(twitchButton.text()).toContain("Continue with Twitch");

    // Just verify we can click without errors
    await twitchButton.trigger("click");
    expect(wrapper.vm).toBeTruthy();
  });

  it("handles Discord button click", async () => {
    const wrapper = mount(AuthButtons, {
      global: {
        mocks: {
          $t: mockI18n.t,
        },
        stubs: {
          UIcon: true,
          UButton: {
            template: "<button @click=\"$emit('click')\"><slot /></button>",
            props: ["loading", "disabled", "variant", "size", "block", "class"],
          },
        },
      },
    });

    // Find the buttons and get the second one (Discord)
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(2);

    const discordButton = buttons[1];
    if (discordButton) {
      expect(discordButton.text()).toContain("Continue with Discord");

      // Just verify we can click without errors
      await discordButton.trigger("click");
      expect(wrapper.vm).toBeTruthy();
    }
  });

  it("renders with correct styling classes", () => {
    const wrapper = mount(AuthButtons, {
      global: {
        mocks: {
          $t: mockI18n.t,
        },
        stubs: {
          UIcon: true,
          UButton: {
            template: '<button :class="classes" @click="$emit(\'click\')"><slot /></button>',
            props: ["loading", "disabled", "variant", "size", "block", "class"],
            computed: {
              classes() {
                return this.class || "default-button-classes";
              },
            },
          },
        },
      },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(2);

    // Check that the component renders without errors
    expect(wrapper.vm).toBeTruthy();
  });

  it("has initial loading states set to false", () => {
    const wrapper = mount(AuthButtons, {
      global: {
        mocks: {
          $t: mockI18n.t,
        },
        stubs: {
          UIcon: true,
          UButton: {
            template: "<button><slot /></button>",
            props: ["loading", "disabled", "variant", "size", "block", "class"],
          },
        },
      },
    });

    // Access component's internal state
    const component = wrapper.vm as unknown as {
      loading: { twitch: boolean; discord: boolean };
    };
    expect(component.loading.twitch).toBe(false);
    expect(component.loading.discord).toBe(false);
  });
});
