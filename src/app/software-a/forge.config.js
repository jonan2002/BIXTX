module.exports = {
  packagerConfig: {
    name: 'bixtx.com Link',
    executableName: 'bixtx-link',
    icon: './assets/icon',
    appBundleId: 'com.bixtx.link',
    appCategoryType: 'public.app-category.utilities',
    win32metadata: {
      CompanyName: 'bixtx.com',
      ProductName: 'bixtx Link Software',
      FileDescription: 'bixtx Link Software - Device Monitoring Agent',
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'bixtx_link',
        authors: 'bixtx.com',
        description: 'bixtx Link Software - Lightweight monitoring agent',
        setupIcon: './assets/icon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'bixtx.com',
          homepage: 'https://bixtx.com',
          icon: './assets/icon.png',
        },
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        icon: './assets/icon.icns',
        format: 'ULFO',
      },
    },
  ],
};
