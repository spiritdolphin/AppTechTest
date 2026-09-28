# Welcome to your new ignited app!

## Sections data

Course Details can show archived class sections between Description and Additional Information.
The app reads the committed `generated/sections/<termCode>.json` files lazily; it does not
download schedule data or parse Parquet at runtime. Sections are omitted when no class
matches the selected course and semester.

The build-time source is UST Archive's
[`classes.parquet`](https://huggingface.co/datasets/ust-archive/schedule/blob/5ee0630dbac7071851fc70c1692f80bea92ade7e/classes.parquet)
at revision `5ee0630dbac7071851fc70c1692f80bea92ade7e` (SHA-256
`6cd099fb5c02c4abda8ebcf06e94e2e3002eb8bc3547df331e46573c1dde7231`).
The upstream dataset labels its license `other`; review its terms before redistributing
the raw Parquet. The raw file is not committed here. Generated section files and their
manifest are committed so a fresh clone runs offline.

To reproduce the section files, run `corepack yarn sections:build`. This downloads only
the pinned source file and verifies its fingerprint. Alternatively, supply a previously
downloaded copy: `corepack yarn sections:build /path/to/classes.parquet`. Run
`corepack yarn data:check` to check both catalogue and section outputs without network
access. The section build uses `term_code + course_id` against the supplied
`courses.json` `term_code + id`, retains the latest snapshot per section, omits inactive
sections, and reports unmatched active records. It does not guess a match by title or
course code. Section enrollment, waitlist, and open status are **historical snapshots**,
not live availability.

> The latest and greatest boilerplate for Infinite Red opinions

This is the boilerplate that [Infinite Red](https://infinite.red) uses as a way to test bleeding-edge changes to our React Native stack.

- [Quick start documentation](https://github.com/infinitered/ignite/blob/master/docs/boilerplate/Boilerplate.md)
- [Full documentation](https://github.com/infinitered/ignite/blob/master/docs/README.md)

## Getting Started

```bash
yarn install
yarn start
```

To make things work on your local simulator, or on your phone, you need first to [run `eas build`](https://github.com/infinitered/ignite/blob/master/docs/expo/EAS.md). We have many shortcuts on `package.json` to make it easier:

```bash
yarn build:ios:sim # build for ios simulator
yarn build:ios:device # build for ios device
yarn build:ios:prod # build for ios device
```

### `./assets`

This directory is designed to organize and store various assets, making it easy for you to manage and use them in your application. The assets are further categorized into subdirectories, including `icons` and `images`:

```tree
assets
├── icons
└── images
```

**icons**
This is where your icon assets will live. These icons can be used for buttons, navigation elements, or any other UI components. The recommended format for icons is PNG, but other formats can be used as well.

Ignite comes with a built-in `Icon` component. You can find detailed usage instructions in the [docs](https://github.com/infinitered/ignite/blob/master/docs/boilerplate/app/components/Icon.md).

**images**
This is where your images will live, such as background images, logos, or any other graphics. You can use various formats such as PNG, JPEG, or GIF for your images.

Another valuable built-in component within Ignite is the `AutoImage` component. You can find detailed usage instructions in the [docs](https://github.com/infinitered/ignite/blob/master/docs/Components-AutoImage.md).

How to use your `icon` or `image` assets:

```typescript
import { Image } from 'react-native';

const MyComponent = () => {
  return (
    <Image source={require('assets/images/my_image.png')} />
  );
};
```

## Running Maestro end-to-end tests

Follow our [Maestro Setup](https://ignitecookbook.com/docs/recipes/MaestroSetup) recipe.

## Next Steps

### Ignite Cookbook

[Ignite Cookbook](https://ignitecookbook.com/) is an easy way for developers to browse and share code snippets (or “recipes”) that actually work.

### Upgrade Ignite boilerplate

Read our [Upgrade Guide](https://ignitecookbook.com/docs/recipes/UpdatingIgnite) to learn how to upgrade your Ignite project.

## Community

⭐️ Help us out by [starring on GitHub](https://github.com/infinitered/ignite), filing bug reports in [issues](https://github.com/infinitered/ignite/issues) or [ask questions](https://github.com/infinitered/ignite/discussions).

💬 Join us on [Slack](https://join.slack.com/t/infiniteredcommunity/shared_invite/zt-1f137np4h-zPTq_CbaRFUOR_glUFs2UA) to discuss.

📰 Make our Editor-in-chief happy by [reading the React Native Newsletter](https://reactnativenewsletter.com/).
