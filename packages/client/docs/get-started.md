<!-- based-docs-remove-start -->
<div align="center">
  <a href="javascript:void(0);" style="pointer-events: none;">
        <img src="../../../.docs/assets/based-logo-black.svg#gh-light-mode-only" style="width: 350px; padding-bottom: 10px;" />
        <img src="../../../.docs/assets/based.svg#gh-dark-mode-only" style="width: 350px; padding-bottom: 10px;" />

  </a>
</div>
<!-- based-docs-remove-end -->
<!-- based-docs-only
<div align="center">
        <img src="../../../.docs/assets/based.svg#gh-dark-mode-only" style="width: 350px; padding-bottom: 10px;" />
</div>
-->

# Getting started

The first step in getting started with using Based is creating a new project. To do so, after logging in, click the `+ New Project` button and type in a new project name.  
Each project can have multiple environments (e.g. development and production).

Go to the based [dashboard](https://based.io/dashboard)

<!-- create-new-project video -->

https://user-images.githubusercontent.com/16743760/164229679-0555beb5-4c56-4843-8fc6-266fa7f15ee4.mov

In order to start adding data to the project, a **schema** is needed. The schema defines your data types, for examples the users of a chat app. To add a new type, click the `+ Create a new type` button.  
Each type can have any number of fields that describe it, for example a user's email. These can be added in the schema editor using the `+ Add Type` button.

<!-- add-user-type-to-schema video-->

https://user-images.githubusercontent.com/16743760/164229696-83de5222-2d8c-4778-8769-a0c3eea1f239.mov

Next, it's time to add some content! This can be done through the Dashboard using the built-in content editor.

<!-- add-content video -->

https://user-images.githubusercontent.com/16743760/164229707-bc9652a2-0823-44b7-825d-1efdcc080ce6.mov

Once the environment is up and running, it is time to jump into the code side of things.

```js
import based from '@based/client'

const client = based({
  org: 'my-org',
  project: 'chat',
  env: 'production',
})

// observe some data
await client.observe(
  { $id: 'root', children: { $all: true, $list: true } },
  (data) => {
    console.log(data)
  }
)

// set data
await client.set({
  type: 'user',
  email: 'francesco@example.com',
  favoriteThing: 'pizza',
})
```

Click [here](https://github.com/atelier-saulx/based/blob/main/packages/client/README.md) to read more about the Javascript Based SDK.
