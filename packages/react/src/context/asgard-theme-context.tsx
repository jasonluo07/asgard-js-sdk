import { createContext, CSSProperties, PropsWithChildren, ReactNode, useContext, useMemo, useCallback } from 'react';
import { deepMerge } from '../utils/deep-merge';
import { darkenColor, lightenColor } from '../utils/color-utils';
import { useAsgardAppInitializationContext, Annotations } from './asgard-app-initialization-context';

export interface AsgardThemeContextValue {
  chatbot: Pick<
    CSSProperties,
    'width' | 'height' | 'maxWidth' | 'minWidth' | 'maxHeight' | 'minHeight' | 'backgroundColor' | 'borderColor'
  > & {
    /**
     * @deprecated Not applied to any element — setting it has no effect. It carries a default of
     * `var(--asg-radius-md)` that nothing reads. Override the `--asg-radius-*` custom properties on
     * `.chatbot_root` until a rounded-corner API lands.
     */
    borderRadius?: CSSProperties['borderRadius'];
    contentMaxWidth?: CSSProperties['maxWidth'];
    backgroundColor?: CSSProperties['backgroundColor'];
    borderColor?: CSSProperties['borderColor'];
    inactiveColor?: CSSProperties['color'];
    mainColor?: CSSProperties['color'];
    secondaryColor?: CSSProperties['color'];
    primaryComponent?: {
      mainColor?: CSSProperties['color'];
      secondaryColor?: CSSProperties['color'];
      /**
       * Foreground color for content sitting *on top of* `mainColor` — card/carousel button labels,
       * the attachment icon glyph and the composer's submit icon.
       *
       * Defaults to `secondaryColor`, which is also the primary text tier (header title, input text,
       * `--asg-color-text-primary`). Those two only agree while `mainColor` is dark: a light `mainColor`
       * (a gold brand accent, say) needs dark text on the accent but light text everywhere else, and one
       * field cannot be both. Set this when `mainColor` is light.
       */
      onMainColor?: CSSProperties['color'];
    };
    style?: CSSProperties;
    header?: Partial<{
      style: CSSProperties;
      title: {
        style: CSSProperties;
      };
      actionButton?: {
        style: CSSProperties;
      };
    }>;
    body?: Partial<{
      style: CSSProperties;
    }>;
    footer?: Partial<{
      style: CSSProperties;
      textArea: {
        style: CSSProperties;
        '::placeholder': CSSProperties;
      };
      attachmentButton: {
        style: CSSProperties;
      };
      submitButton: {
        style: CSSProperties;
      };
      speechInputButton: {
        style: CSSProperties;
      };
    }>;
  };
  botMessage: Pick<CSSProperties, 'color' | 'backgroundColor'> & {
    carouselButtonBackgroundColor?: CSSProperties['backgroundColor'];
    /**
     * @deprecated Never read by any component — setting it has no effect. It was also derived
     * incorrectly (`darkenColor(bubbleBackground, 0.2)`, which is low-contrast against the very
     * background it darkens); that derivation is gone as of BUILD-039.
     *
     * Style markdown links through the `--asgard-markdown-link` / `--asgard-markdown-link-hover`
     * custom properties instead — they follow `chatbot.primaryComponent.mainColor`.
     */
    linkColor?: CSSProperties['color'];
    unsentBackgroundColor?: CSSProperties['backgroundColor'];
    quickReplyBackgroundColor?: CSSProperties['backgroundColor'];
  };
  userMessage: Pick<CSSProperties, 'color' | 'backgroundColor'>;
  template?: Partial<{
    /**
     * first level for common/shared properties.
     * Check MessageTemplate type for more details (packages/core/src/types/sse-response.ts).
     */
    quickReplies?: Partial<{
      style: CSSProperties;
      button: {
        style: CSSProperties;
      };
    }>;
    references?: Partial<{
      style: CSSProperties;
      title?: {
        style: CSSProperties;
      };
      /**
       * @deprecated Not read by `references.tsx`, which only applies `references.style` and
       * `references.title.style` — setting it has no effect. Style the list container through
       * `references.style` instead.
       */
      item?: {
        style: CSSProperties;
      };
    }>;
    time?: Partial<{
      style: CSSProperties;
    }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    TextMessageTemplate: Partial<{ style: CSSProperties }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    HintMessageTemplate: Partial<{ style: CSSProperties }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    ImageMessageTemplate: Partial<{ style: CSSProperties }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    VideoMessageTemplate: Partial<{ style: CSSProperties }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    AudioMessageTemplate: Partial<{ style: CSSProperties }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    LocationMessageTemplate: Partial<{
      style: CSSProperties;
      title?: {
        style: CSSProperties;
      };
      description?: {
        style: CSSProperties;
      };
    }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    ChartMessageTemplate: Partial<{ style: CSSProperties }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    ButtonMessageTemplate: Partial<{
      style: CSSProperties;
      title?: {
        style: CSSProperties;
      };
      description?: {
        style: CSSProperties;
      };
      button?: {
        style: CSSProperties;
      };
    }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    CarouselMessageTemplate: Partial<{
      style: CSSProperties;
      card: {
        style: CSSProperties;
        title?: {
          style: CSSProperties;
        };
        description?: {
          style: CSSProperties;
        };
        button?: {
          style: CSSProperties;
        };
      };
    }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    TableMessageTemplate: Partial<{ style: CSSProperties }>;
    /**
     * TBD: Fill the necessary properties based on the requirements.
     */
    AttachmentMessageTemplate: Partial<{
      style: CSSProperties;
      title?: {
        style: CSSProperties;
      };
      description?: {
        style: CSSProperties;
      };
      iconBox?: {
        style: CSSProperties;
      };
      downloadButton?: {
        style: CSSProperties;
      };
    }>;
  }>;
}

/**
 * The type of the `theme` prop on `<Chatbot />` — annotate theme objects with this.
 *
 * It is `Partial<AsgardThemeContextValue>` because every section is optional at the call site: a theme
 * that only sets `chatbot` is valid, and the provider merges it over the defaults. `AsgardThemeContextValue`
 * itself stays the *resolved* shape — what `useAsgardThemeContext()` returns, with every section present.
 *
 * ```ts
 * const theme: ChatbotTheme = { chatbot: { backgroundColor: '#141414' } };
 * ```
 */
export type ChatbotTheme = Partial<AsgardThemeContextValue>;

export const defaultAsgardThemeContextValue: AsgardThemeContextValue = {
  chatbot: {
    width: '375px',
    height: '640px',
    backgroundColor: 'var(--asg-color-bg)',
    borderColor: 'var(--asg-color-border)',
    borderRadius: 'var(--asg-radius-md)',
    contentMaxWidth: '1200px',
    style: {},
    header: {
      style: {},
      title: {
        style: {},
      },
      actionButton: {
        style: {},
      },
    },
    body: {
      style: {},
    },
    footer: {
      style: {},
      textArea: {
        style: {},
        '::placeholder': {
          color: 'var(--asg-color-text-placeholder)',
        },
      },
      attachmentButton: {
        style: {},
      },
      submitButton: {
        style: {},
      },
      speechInputButton: {
        style: {},
      },
    },
  },
  botMessage: {
    // `--asg-color-text` was never emitted by the palette (it generates `-text-primary` /
    // `-text-secondary` / `-text-disabled` / `-text-placeholder`, no bare `-text`), so bubble text
    // silently inherited the host page's color and the token consumers reach for had no effect.
    color: 'var(--asg-color-text-primary)',
    backgroundColor: 'var(--asg-color-secondary)',
  },
  userMessage: {
    color: 'var(--asg-color-text-primary)',
    backgroundColor: 'var(--asg-color-primary)',
  },
  template: {
    quickReplies: {
      style: {},
      button: {
        style: {},
      },
    },
    references: {
      style: {},
      title: {
        style: {},
      },
      item: {
        style: {},
      },
    },
    time: {
      style: {},
    },
    TextMessageTemplate: {
      style: {},
    },
    HintMessageTemplate: {
      style: {},
    },
    ImageMessageTemplate: {
      style: {},
    },
    VideoMessageTemplate: {
      style: {},
    },
    AudioMessageTemplate: {
      style: {},
    },
    LocationMessageTemplate: {
      style: {},
      title: {
        style: {},
      },
      description: {
        style: {},
      },
    },
    ChartMessageTemplate: {
      style: {},
    },
    ButtonMessageTemplate: {
      style: {},
      title: {
        style: {},
      },
      description: {
        style: {},
      },
      button: {
        style: {
          border: '1px solid var(--asg-color-border)',
        },
      },
    },
    CarouselMessageTemplate: {
      style: {},
      card: {
        style: {},
        title: {
          style: {},
        },
        description: {
          style: {},
        },
        button: {
          style: {
            border: '1px solid var(--asg-color-border)',
          },
        },
      },
    },
    TableMessageTemplate: {
      style: {},
    },
    AttachmentMessageTemplate: {
      style: {},
      title: {
        style: {},
      },
      description: {
        style: {},
      },
      iconBox: {
        style: {},
      },
      downloadButton: {
        style: {},
      },
    },
  },
};

export const AsgardThemeContext = createContext<AsgardThemeContextValue>(defaultAsgardThemeContextValue);

export function AsgardThemeContextProvider(
  props: PropsWithChildren<{
    theme?: Partial<AsgardThemeContextValue>;
  }>,
): ReactNode {
  const { children, theme = {} } = props;
  const {
    data: { annotations },
  } = useAsgardAppInitializationContext();

  const deepMergeTheme = useCallback(
    function () {
      /**
       * Orders of theme (high to low):
       * 1. Theme from props
       * 2. Theme from annotations
       * 3. Default theme
       */

      const themeFromAnnotations: Annotations['embedConfig']['theme'] = annotations?.embedConfig?.theme ?? {
        chatbot: {},
        botMessage: {},
        userMessage: {},
      };

      // Content that sits on the `mainColor` accent takes `onMainColor`, falling back to `secondaryColor`
      // (the primary text tier) so an annotation set that predates this field keeps its current colors.
      const onMainFromAnnotations =
        themeFromAnnotations.chatbot?.primaryComponent?.onMainColor ??
        themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor;

      const tempTheme = deepMerge(defaultAsgardThemeContextValue as unknown as Record<string, unknown>, {
        chatbot: {
          backgroundColor: themeFromAnnotations.chatbot?.backgroundColor,
          borderColor: themeFromAnnotations.chatbot?.borderColor,
          mainColor: themeFromAnnotations.chatbot?.primaryComponent?.mainColor,
          secondaryColor: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor,

          header: {
            style: {
              borderBottomColor: themeFromAnnotations.chatbot?.borderColor,
            },
            title: {
              style: {
                color: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor, // Title text color
              },
            },
            actionButton: {
              style: {
                color: themeFromAnnotations.chatbot?.inactiveColor,
              },
            },
          },
          body: {
            style: {
              // Time/timestamp text color
              color: themeFromAnnotations.chatbot?.inactiveColor,
            },
          },
          footer: {
            style: {
              borderTopColor: themeFromAnnotations.chatbot?.borderColor,
            },
            textArea: {
              style: {
                color: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor,
                backgroundColor: themeFromAnnotations.chatbot?.backgroundColor,
                borderColor: themeFromAnnotations.chatbot?.borderColor,
              },
              '::placeholder': {
                color: themeFromAnnotations.chatbot?.inactiveColor,
              },
            },
            attachmentButton: {
              style: {
                color: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor,
              },
            },
            submitButton: {
              style: {
                // Sits on the `--asg-color-primary` pill, so it follows the accent's foreground.
                color: onMainFromAnnotations,
              },
            },
            speechInputButton: {
              style: {
                color: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor,
              },
            },
          },
        },
        botMessage: {
          backgroundColor: themeFromAnnotations.botMessage?.backgroundColor, // #585858
          color: themeFromAnnotations.botMessage?.color,
          unsentBackgroundColor: themeFromAnnotations.botMessage?.backgroundColor
            ? `color-mix(in srgb, ${themeFromAnnotations.botMessage.backgroundColor} 20%, transparent)`
            : undefined,
          quickReplyBackgroundColor: themeFromAnnotations.botMessage?.backgroundColor
            ? `color-mix(in srgb, ${themeFromAnnotations.botMessage.backgroundColor} 20%, transparent)`
            : undefined,
        },
        userMessage: {
          backgroundColor: themeFromAnnotations.userMessage?.backgroundColor,
          color: themeFromAnnotations.userMessage?.color,
        },
        template: {
          quickReplies: {
            button: {
              style: {
                // Quick replies sit on the translucent bot-message surface, not on the primary accent.
                color: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor,
                borderColor: themeFromAnnotations.chatbot?.borderColor,
                backgroundColor: themeFromAnnotations.botMessage?.backgroundColor
                  ? `${themeFromAnnotations.botMessage.backgroundColor}33`
                  : undefined,
              },
            },
          },
          time: {
            style: {
              color: themeFromAnnotations.chatbot?.inactiveColor,
            },
          },
          TextMessageTemplate: {
            style: {
              // For unset messages
              color: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor,
            },
          },
          HintMessageTemplate: {
            style: {
              color: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor,
            },
          },
          ButtonMessageTemplate: {
            style: {
              backgroundColor: themeFromAnnotations.botMessage?.carouselButtonBackgroundColor,
            },
            title: {
              style: {
                color: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor,
              },
            },
            description: {
              style: {
                color: themeFromAnnotations.chatbot?.inactiveColor,
              },
            },
            button: {
              style: {
                borderColor: themeFromAnnotations.chatbot?.primaryComponent?.mainColor,
                backgroundColor: themeFromAnnotations.chatbot?.primaryComponent?.mainColor,
                color: onMainFromAnnotations,
              },
            },
          },
          CarouselMessageTemplate: {
            card: {
              style: {
                backgroundColor: themeFromAnnotations.botMessage?.carouselButtonBackgroundColor,
              },
              title: {
                style: {
                  color: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor,
                },
              },
              description: {
                style: {
                  color: themeFromAnnotations.chatbot?.inactiveColor,
                },
              },
              button: {
                style: {
                  borderColor: themeFromAnnotations.chatbot?.primaryComponent?.mainColor,
                  backgroundColor: themeFromAnnotations.chatbot?.primaryComponent?.mainColor,
                  color: onMainFromAnnotations,
                },
              },
            },
          },
          AttachmentMessageTemplate: {
            style: {
              backgroundColor: themeFromAnnotations.botMessage?.carouselButtonBackgroundColor,
            },
            title: {
              style: {
                color: themeFromAnnotations.chatbot?.primaryComponent?.secondaryColor,
              },
            },
            description: {
              style: {
                color: themeFromAnnotations.chatbot?.inactiveColor,
              },
            },
            iconBox: {
              style: {
                backgroundColor: themeFromAnnotations.chatbot?.primaryComponent?.mainColor,
                color: onMainFromAnnotations,
              },
            },
            downloadButton: {
              style: {
                color: themeFromAnnotations.chatbot?.inactiveColor,
              },
            },
          },
        },
      });

      const mergedTheme = deepMerge(tempTheme, theme) as AsgardThemeContextValue;

      // Ensure prop-level chatbot.borderColor is also applied to nested styles
      if (theme?.chatbot?.borderColor) {
        const borderColor = theme.chatbot.borderColor;

        // Apply to header
        if (mergedTheme.chatbot.header?.style) {
          mergedTheme.chatbot.header.style.borderBottomColor = borderColor;
        }

        // Apply to footer
        if (mergedTheme.chatbot.footer?.style) {
          mergedTheme.chatbot.footer.style.borderTopColor = borderColor;
        }

        // The textarea used to carry the composer's border; under BUILD-028 the border belongs to the
        // pill around it, which reads `--asg-color-border` (derived from this same `borderColor` below).
        // Writing it here too would draw a second, inner border.

        // Apply to quick reply buttons
        if (mergedTheme.template?.quickReplies?.button?.style) {
          mergedTheme.template.quickReplies.button.style.borderColor = borderColor;
        }
      }

      // Ensure prop-level chatbot.primaryComponent.secondaryColor is also applied to textarea text color and footer buttons
      if (theme?.chatbot?.primaryComponent?.secondaryColor) {
        const textColor = theme.chatbot.primaryComponent.secondaryColor;

        // Apply to textarea text color
        if (mergedTheme.chatbot.footer?.textArea?.style) {
          mergedTheme.chatbot.footer.textArea.style.color = textColor;
        }

        // Apply to attachment button color
        if (mergedTheme.chatbot.footer?.attachmentButton?.style) {
          mergedTheme.chatbot.footer.attachmentButton.style.color = textColor;
        }

        // Apply to submit button color
        if (mergedTheme.chatbot.footer?.submitButton?.style) {
          mergedTheme.chatbot.footer.submitButton.style.color = textColor;
        }

        // Apply to speech input button color
        if (mergedTheme.chatbot.footer?.speechInputButton?.style) {
          mergedTheme.chatbot.footer.speechInputButton.style.color = textColor;
        }
      }

      // Ensure prop-level chatbot.inactiveColor is also applied to placeholder color
      if (theme?.chatbot?.inactiveColor) {
        const placeholderColor = theme.chatbot.inactiveColor;

        // Apply to textarea placeholder color
        if (mergedTheme.chatbot.footer?.textArea?.['::placeholder']) {
          mergedTheme.chatbot.footer.textArea['::placeholder'].color = placeholderColor;
        }
      }

      // The surface elevation that used to be painted onto the textarea now belongs to the composer pill,
      // which reads `--asg-color-surface` — already derived from `chatbot.backgroundColor` further down.
      // The textarea itself is transparent under BUILD-028, so an inline background would show as a
      // mismatched block inside the pill.

      // Ensure prop-level chatbot.inactiveColor is also applied to time color
      if (theme?.chatbot?.inactiveColor) {
        if (mergedTheme.template?.time?.style) {
          mergedTheme.template.time.style.color = theme.chatbot.inactiveColor;
        }

        // Apply to header action buttons (refresh, close)
        if (mergedTheme.chatbot.header?.actionButton?.style) {
          mergedTheme.chatbot.header.actionButton.style.color = theme.chatbot.inactiveColor;
        }
      }

      // Ensure prop-level botMessage.carouselButtonBackgroundColor is also applied to card backgrounds
      if (theme?.botMessage?.carouselButtonBackgroundColor) {
        const cardBgColor = theme.botMessage.carouselButtonBackgroundColor;

        // Apply to button template card background color
        if (mergedTheme.template?.ButtonMessageTemplate?.style) {
          mergedTheme.template.ButtonMessageTemplate.style.backgroundColor = cardBgColor;
        }

        // Apply to carousel card background color
        if (mergedTheme.template?.CarouselMessageTemplate?.card?.style) {
          mergedTheme.template.CarouselMessageTemplate.card.style.backgroundColor = cardBgColor;
        }

        // Apply to location template card background color
        if (mergedTheme.template?.LocationMessageTemplate?.style) {
          mergedTheme.template.LocationMessageTemplate.style.backgroundColor = cardBgColor;
        }

        // Apply to attachment chip background color
        if (mergedTheme.template?.AttachmentMessageTemplate?.style) {
          mergedTheme.template.AttachmentMessageTemplate.style.backgroundColor = cardBgColor;
        }
      }

      // Ensure prop-level chatbot.primaryComponent.secondaryColor is also applied to titles and text
      if (theme?.chatbot?.primaryComponent?.secondaryColor) {
        const titleColor = theme.chatbot.primaryComponent.secondaryColor;

        // Apply to chatbot header title color
        if (mergedTheme.chatbot.header?.title?.style) {
          mergedTheme.chatbot.header.title.style.color = titleColor;
        }

        // Apply to hint template text color
        if (mergedTheme.template?.HintMessageTemplate?.style) {
          mergedTheme.template.HintMessageTemplate.style.color = titleColor;
        }

        // Apply to button template card title color
        if (mergedTheme.template?.ButtonMessageTemplate?.title?.style) {
          mergedTheme.template.ButtonMessageTemplate.title.style.color = titleColor;
        }

        // Apply to carousel card title color
        if (mergedTheme.template?.CarouselMessageTemplate?.card?.title?.style) {
          mergedTheme.template.CarouselMessageTemplate.card.title.style.color = titleColor;
        }

        // Apply to location template card title color
        if (mergedTheme.template?.LocationMessageTemplate?.title?.style) {
          mergedTheme.template.LocationMessageTemplate.title.style.color = titleColor;
        }

        // Apply to attachment chip title color
        if (mergedTheme.template?.AttachmentMessageTemplate?.title?.style) {
          mergedTheme.template.AttachmentMessageTemplate.title.style.color = titleColor;
        }
      }

      // Ensure prop-level chatbot.inactiveColor is also applied to card descriptions
      if (theme?.chatbot?.inactiveColor) {
        // Apply to button template card description color
        if (mergedTheme.template?.ButtonMessageTemplate?.description?.style) {
          mergedTheme.template.ButtonMessageTemplate.description.style.color = theme.chatbot.inactiveColor;
        }

        // Apply to carousel card description color
        if (mergedTheme.template?.CarouselMessageTemplate?.card?.description?.style) {
          mergedTheme.template.CarouselMessageTemplate.card.description.style.color = theme.chatbot.inactiveColor;
        }

        // Apply to location template card description color
        if (mergedTheme.template?.LocationMessageTemplate?.description?.style) {
          mergedTheme.template.LocationMessageTemplate.description.style.color = theme.chatbot.inactiveColor;
        }

        // Apply to attachment chip description color
        if (mergedTheme.template?.AttachmentMessageTemplate?.description?.style) {
          mergedTheme.template.AttachmentMessageTemplate.description.style.color = theme.chatbot.inactiveColor;
        }

        // Apply to attachment download button color
        if (mergedTheme.template?.AttachmentMessageTemplate?.downloadButton?.style) {
          mergedTheme.template.AttachmentMessageTemplate.downloadButton.style.color = theme.chatbot.inactiveColor;
        }
      }

      // Ensure prop-level chatbot.primaryComponent colors are also applied to card buttons
      if (theme?.chatbot?.primaryComponent?.mainColor) {
        const buttonBgColor = theme.chatbot.primaryComponent.mainColor;

        // Apply to button template button background
        if (mergedTheme.template?.ButtonMessageTemplate?.button?.style) {
          mergedTheme.template.ButtonMessageTemplate.button.style.backgroundColor = buttonBgColor;
          mergedTheme.template.ButtonMessageTemplate.button.style.borderColor = buttonBgColor;
        }

        // Apply to carousel card button background
        if (mergedTheme.template?.CarouselMessageTemplate?.card?.button?.style) {
          mergedTheme.template.CarouselMessageTemplate.card.button.style.backgroundColor = buttonBgColor;
          mergedTheme.template.CarouselMessageTemplate.card.button.style.borderColor = buttonBgColor;
        }

        // Apply to attachment chip icon box background
        if (mergedTheme.template?.AttachmentMessageTemplate?.iconBox?.style) {
          mergedTheme.template.AttachmentMessageTemplate.iconBox.style.backgroundColor = buttonBgColor;
        }
      }

      // Everything below sits on the `mainColor` accent, so it takes `onMainColor` and falls back to
      // `secondaryColor` — the pre-`onMainColor` behavior, kept so existing consumers don't shift.
      const buttonTextColor =
        theme?.chatbot?.primaryComponent?.onMainColor ?? theme?.chatbot?.primaryComponent?.secondaryColor;

      if (buttonTextColor) {
        // Apply to button template button text color
        if (mergedTheme.template?.ButtonMessageTemplate?.button?.style) {
          mergedTheme.template.ButtonMessageTemplate.button.style.color = buttonTextColor;
        }

        // Apply to carousel card button text color
        if (mergedTheme.template?.CarouselMessageTemplate?.card?.button?.style) {
          mergedTheme.template.CarouselMessageTemplate.card.button.style.color = buttonTextColor;
        }

        // Apply to attachment chip icon box color (the icon glyph color)
        if (mergedTheme.template?.AttachmentMessageTemplate?.iconBox?.style) {
          mergedTheme.template.AttachmentMessageTemplate.iconBox.style.color = buttonTextColor;
        }
      }

      // Quick replies sit on the translucent bot-message surface rather than on `mainColor`, so they
      // stay on the primary text tier even when accent-backed controls use a contrasting on-main color.
      if (theme?.chatbot?.primaryComponent?.secondaryColor && mergedTheme.template?.quickReplies?.button?.style) {
        mergedTheme.template.quickReplies.button.style.color = theme.chatbot.primaryComponent.secondaryColor;
      }

      // Ensure prop-level botMessage.backgroundColor is also applied to quick reply button background
      if (theme?.botMessage?.backgroundColor) {
        const quickReplyBgColor = `${theme.botMessage.backgroundColor}33`;

        // Apply to quick reply button background color
        if (mergedTheme.template?.quickReplies?.button?.style) {
          mergedTheme.template.quickReplies.button.style.backgroundColor = quickReplyBgColor;
        }
      }

      // Wire the effective theme colors to the SCSS design-token CSS variables, so a few theme settings
      // color the *whole* chatbot — not just the templated bubbles/buttons. The run indicator, input,
      // the channel-title bar, tool-call rows, the thinking block, and the Task/Subagent panels read these
      // `--asg-color-*` / `--asgard-*` tokens (fixed by default), so setting them from the theme is what makes
      // those surfaces follow it. Each token is injected only when the theme provides a concrete color
      // (a hex, or a non-`var()` border); otherwise the SCSS default is kept (backward compatible).
      const themeVars: Record<string, string> = {};

      // A concrete 6-digit hex can be lightened/darkened arithmetically; any other value (a `var()`
      // token, `oklch(…)`, `color-mix(…)`, `rgb(…)`) is passed through as-is so consumers can wire the
      // chat to their own design tokens — derived shades for those fall back to CSS `color-mix()`.
      const isHex = (color: string): boolean => /^#[0-9a-fA-F]{6}$/.test(color);
      const darker = (color: string): string =>
        isHex(color) ? darkenColor(color, 0.15) : `color-mix(in srgb, ${color} 85%, #000)`;
      const lighter = (color: string): string =>
        isHex(color) ? lightenColor(color, 0.08) : `color-mix(in srgb, ${color} 92%, #fff)`;
      // A translucent wash of a color, for overlays that sit on whatever surface is behind them
      // (markdown's muted text, hairlines and tinted code/table backgrounds).
      const wash = (color: string, percent: number): string => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

      // Primary → the accent (run indicator, input focus, buttons) + a darkened hover/active shade.
      const effectivePrimary = mergedTheme.chatbot?.primaryComponent?.mainColor;
      if (effectivePrimary) {
        themeVars['--asg-color-primary'] = effectivePrimary;
        themeVars['--asg-color-primary-dark'] = darker(effectivePrimary);
        // Markdown links were stuck on a fixed `#3b82f6` / `#2563eb` pair that no theme could reach —
        // the one bot-facing surface most likely to clash with a brand accent. They follow the accent
        // and its darkened hover shade, the same pair the run indicator and buttons already use.
        themeVars['--asgard-markdown-link'] = effectivePrimary;
        themeVars['--asgard-markdown-link-hover'] = darker(effectivePrimary);
      }

      // On-primary → the foreground of the surfaces painted with the accent above (the composer's submit
      // icon, card/carousel button labels, the attachment icon glyph). The palette generates this token
      // as a fixed `#ffffff`, which only works while the accent is dark; wiring it here lets a light
      // accent state its own contrasting foreground.
      const effectiveOnPrimary = mergedTheme.chatbot?.primaryComponent?.onMainColor;
      if (typeof effectiveOnPrimary === 'string' && effectiveOnPrimary) {
        themeVars['--asg-color-primary-on-primary'] = effectiveOnPrimary;
        // The consent modal's confirm button is painted with the accent, so its label belongs to the
        // same on-accent tier. It had been pinned to `#000000`, unreadable on a dark accent.
        themeVars['--asgard-consent-modal-primary-fg'] = effectiveOnPrimary;
      }

      // Background → the base bg + a `surface` one step lighter (cards / channel-title / tool-call rows /
      // Task & Subagent panels sit on the surface, keeping a subtle elevation over the base).
      const effectiveBg = mergedTheme.chatbot?.backgroundColor;
      if (typeof effectiveBg === 'string' && effectiveBg) {
        const surface = lighter(effectiveBg);
        themeVars['--asg-color-bg'] = effectiveBg;
        themeVars['--asg-color-surface'] = surface;
        themeVars['--asgard-tool-call-item-bg'] = surface;
        // Thinking block shares the same surface elevation as the tool-call group (same bordered chrome).
        themeVars['--asgard-thinking-bg'] = surface;
        // Expanded tool-call JSON viewer: body = base bg (a step darker than the surface it sits on, so
        // the code block reads as inset), header = surface (a step lighter than the body).
        themeVars['--asgard-json-viewer-bg'] = effectiveBg;
        themeVars['--asgard-json-viewer-header-bg'] = surface;
        // Markdown code blocks read as inset the same way the JSON viewer body does. Unlike the tokens
        // above, this one replaces a fixed `#1a1a1a` that is unrelated to the palette, so it is only
        // taken when the theme names a concrete color — the default `var(--asg-color-bg)` passthrough
        // would otherwise repaint code blocks in a chatbot that was never themed.
        if (!effectiveBg.startsWith('var(')) {
          themeVars['--asgard-markdown-pre-bg'] = effectiveBg;
          // The consent modal's command block is the same kind of inset code surface, and its fixed
          // `#0f172a` is likewise unrelated to the palette — so it takes the same concrete-color gate.
          themeVars['--asgard-consent-modal-code-bg'] = effectiveBg;
        }
      }

      // Border → the border + divider + the tool-call / panel / thinking-block border (all the bordered
      // thread containers share the theme border so none is left on the fixed `#333` default).
      const effectiveBorder = mergedTheme.chatbot?.borderColor;
      if (typeof effectiveBorder === 'string' && effectiveBorder) {
        themeVars['--asg-color-border'] = effectiveBorder;
        themeVars['--asg-color-divider'] = effectiveBorder;
        themeVars['--asgard-tool-call-border'] = effectiveBorder;
        themeVars['--asgard-thinking-border'] = effectiveBorder;
        // The consent modal's command block outline. Unlike the two above — whose fallbacks are already
        // the shared border chain — this one falls back to a fixed `#1e293b` unrelated to the palette,
        // so it takes the same concrete-color gate as its `code-bg` companion: the default
        // `var(--asg-color-border)` passthrough would otherwise repaint the block in an unthemed chatbot.
        if (!effectiveBorder.startsWith('var(')) {
          themeVars['--asgard-consent-modal-code-border'] = effectiveBorder;
        }
      }

      // Inactive → the muted text/icon tier (tool-call & thinking headers, chevrons, the Task/Subagent
      // rows, the channel title). Reuses `inactiveColor`'s established meaning — it already colors the
      // timestamp, the placeholder and the header action icons — so the muted tier is themed by the same
      // field everywhere instead of being stuck on the palette default.
      const effectiveInactive = mergedTheme.chatbot?.inactiveColor;
      if (typeof effectiveInactive === 'string' && effectiveInactive) {
        themeVars['--asg-color-text-secondary'] = effectiveInactive;
        themeVars['--asg-color-action-inactive'] = effectiveInactive;
      }

      // Secondary → the primary text/icon tier (tool-call item labels, hover states), matching the field
      // that already colors the header title and the input text.
      const effectiveForeground = mergedTheme.chatbot?.primaryComponent?.secondaryColor;
      if (typeof effectiveForeground === 'string' && effectiveForeground) {
        themeVars['--asg-color-text-primary'] = effectiveForeground;
        themeVars['--asg-color-action-active'] = effectiveForeground;

        // Markdown had been left on its own `--asgard-markdown-*` scale with fixed dark fallbacks, so a
        // light-themed chatbot rendered blockquotes as white-on-white. Every one of those fallbacks is a
        // wash of white — the same `#ffffff` this field defaults to — so re-deriving them from the theme
        // foreground at the identical percentages themes markdown without moving the untouched default.
        themeVars['--asgard-markdown-blockquote'] = wash(effectiveForeground, 70);
        themeVars['--asgard-markdown-blockquote-border'] = wash(effectiveForeground, 30);
        themeVars['--asgard-markdown-hr'] = wash(effectiveForeground, 20);
        themeVars['--asgard-markdown-table-border'] = wash(effectiveForeground, 20);
        themeVars['--asgard-markdown-code-bg'] = wash(effectiveForeground, 10);
        themeVars['--asgard-markdown-table-header-bg'] = wash(effectiveForeground, 5);
        themeVars['--asgard-markdown-table-row-alt'] = wash(effectiveForeground, 2);

        // Three more surfaces whose fixed fallbacks are washes of white for the same reason, and break
        // the same way under a light theme: the expanded tool-call JSON body text (`#d4d4d4` ≈ 83% white),
        // the thinking block's reasoning text (80%), and the tool-call row hover tint (10%).
        themeVars['--asgard-json-viewer-text'] = wash(effectiveForeground, 83);
        themeVars['--asgard-thinking-reasoning'] = wash(effectiveForeground, 80);
        themeVars['--asgard-tool-call-hover'] = wash(effectiveForeground, 10);
      }

      if (Object.keys(themeVars).length > 0 && mergedTheme.chatbot) {
        mergedTheme.chatbot.style = {
          ...mergedTheme.chatbot.style,
          ...themeVars,
        } as CSSProperties;
      }

      return mergedTheme;
    },
    [theme, annotations?.embedConfig?.theme],
  );

  const value = useMemo(() => deepMergeTheme(), [deepMergeTheme]);

  return <AsgardThemeContext.Provider value={value}>{children}</AsgardThemeContext.Provider>;
}

export function useAsgardThemeContext(): AsgardThemeContextValue {
  return useContext(AsgardThemeContext);
}
