<template>
  <footer class="relative w-full bg-[rgba(0,0,0,0.4)] px-4 py-2">
    <div class="container mx-auto text-center text-xs">
      <div class="mb-2 grid grid-cols-1 items-center gap-2 sm:grid-cols-3">
        <!-- Community Links -->
        <div class="flex flex-col items-center gap-1">
          <i18n-t keypath="footer.call_to_action.discord_phrase" scope="global">
            <template #discord>
              <a
                href="https://discord.gg/zeAP4Ng"
                target="_blank"
                class="footer-link flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="opacity-80"
                >
                  <path
                    d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03
                    c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09
                    c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02
                    c-2.72 4.07-3.47 8.03-3.1 11.95
                    c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02
                    c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78
                    c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01
                    c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26
                    c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09
                    c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65
                    c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95
                    c-.01-.01-.02-.02-.04-.02
                    zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12
                    c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0
                    c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12
                    c0 1.17-.83 2.12-1.89 2.12z"
                  />
                </svg>
                {{ t('footer.call_to_action.discord') }}
              </a>
            </template>
          </i18n-t>
          <i18n-t keypath="footer.call_to_action.github_phrase" scope="global">
            <template #github>
              <a
                href="https://github.com/tarkovtracker-org/TarkovTracker"
                target="_blank"
                class="footer-link flex items-center gap-1"
              >
                <UIcon name="i-mdi-github" class="h-3.5 w-3.5 opacity-80" />
                {{ t('footer.call_to_action.github') }}
              </a>
            </template>
          </i18n-t>
        </div>
        <!-- Support Development Section -->
        <div class="flex flex-col items-center gap-1">
          <a
            href="https://ko-fi.com/dysektai"
            target="_blank"
            class="kofi-link inline-flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="mr-1"
            >
              <path
                d="
                  M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604
                  0-.679.798-.679.798s-.082 7.324-.033 11.414c.049
                  4.271 3.468 7.433 8.33 7.433s8.245-3.129
                  8.245-3.129c.508-.637.411-1.492.411-1.492s-.193-2.951-.193-2.951H23.881zm
                  -4.859 4.593H.723V8.948s4.859 0 4.859 0v4.593h4.859V8.948s4.859 0 4.859 0v4.593z
                "
              />
            </svg>
            Support on Ko-fi
          </a>
          <div class="text-[9px] leading-tight text-white/50 italic">
            Help keep TarkovTracker free and updated
          </div>
        </div>
        <!-- Legal Links Section -->
        <div class="flex flex-col items-center gap-1">
          <router-link to="/terms-of-service" target="_blank" class="footer-link">
            Terms
          </router-link>
          <router-link to="/privacy" target="_blank" class="footer-link">Privacy</router-link>
        </div>
      </div>
      <!-- Footer Bottom Section -->
      <div class="text-[11px] text-white/60">
        <div class="mb-1 leading-tight">
          Game content and materials are trademarks and copyrights of Battlestate Games and its
          licensors. All rights reserved.
        </div>
        <div class="font-medium text-white/70">
          TarkovTracker &copy; 2020 - {{ new Date().getFullYear() }}
        </div>
      </div>
    </div>
  </footer>
</template>
<script setup>
  import { useI18n } from 'vue-i18n';
  const { t } = useI18n({ useScope: 'global' });
</script>
<style lang="scss" scoped>
  .footer-link {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-size: 12px;
    transition: all 0.2s ease;
    &:hover {
      color: rgb(var(--color-primary-500));
      text-decoration: none;
    }
  }
  .kofi-link {
    background: linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-warning-400) 100%);
    color: white !important;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 11px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
    box-shadow: 0 1px 4px color-mix(in srgb, var(--color-primary-400) 30%, transparent);
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary-400) 40%, transparent);
      color: white !important;
    }
  }
</style>
