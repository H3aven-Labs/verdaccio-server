#!/usr/bin/env node

import { runServer, ConfigBuilder } from 'verdaccio';
import { Command } from 'commander';

const program = new Command();

program
  .name('@h3aven-labs/verdaccio-server')
  .description('CLI to run Verdaccio server with h3aven projects config')
  .version('0.1.0')
  .requiredOption('-t, --githubToken <token>', 'Github token')
  .option('--title <title>', 'Registry title')
  .option('--htpasswdFilePath <htpasswdFilePath>', '.htpasswd file')
  .option('--storagePath <storagePath>', 'Storage path')
  .option('-p, --port <port>', 'Server port')
  .action(async (options) => {
    const token = options.githubToken;
    const port = options.port || 4873;
    const filesDefaultPath = '/tmp/@h3aven-labs/verdaccio-server';
    const buildedConfig = ConfigBuilder.build();
    const storagePath = options.storagePath || `${filesDefaultPath}/storage`;
    const htpasswdFilePath =  options.htpasswdFilePath || `${filesDefaultPath}/htpasswd`;

    console.log(`\nstoragePath >> ${storagePath}`);
    console.log(`htpasswdFilePath >> ${htpasswdFilePath}\n`);

    buildedConfig
      .addUplink(
        'npmjs',
        {
          url: 'https://registry.npmjs.org/'
        }
      )
      .addUplink(
        'github',
        {
          url: 'https://npm.pkg.github.com',
          auth: {
            type: 'bearer',
            token
          }
        }
      )
      .addPackageAccess('@h3aven-labs/*', {
        access: '$all',
        publish: '$all',
        unpublish: '$authenticated',
        proxy: 'github'
      })
      .addPackageAccess('@*/*', {
        access: '$all',
        publish: '$authenticated',
        unpublish: '$authenticated',
        proxy: 'npmjs'
      })
      .addPackageAccess('*/*', {
        access: '$all',
        publish: '$authenticated',
        unpublish: '$authenticated',
        proxy: 'npmjs'
      })
      .addLogger({
        level: 'http',
        type: 'stdout',
        format: 'pretty'
      })
      .addStorage(storagePath)
      .addSecurity({ api: { legacy: true } });

    const baseConfig = buildedConfig.getConfig();
    const config = {
      web: {
        title: options.title || 'Verdaccio'
      },
      auth: {
        htpasswd: {
          file: options.htpasswdFilePath || `${filesDefaultPath}/htpasswd`
        }
      },
      i18n: {
        web: 'en-US'
      },
      server: {
        keepAliveTimeout: 60
      },
      middlewares: {
        audit: {
          enabled: true
        }
      },
      self_path: storagePath,
      ...baseConfig
    };

    const app = await runServer(config);

    app.listen(Number(port));
  });

program.parse();
