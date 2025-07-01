const downloadFile = (downloadUrl, attempt = 1) => {
      const file = fs.createWriteStream(downloadPath);
      
      // Parse URL to handle different protocols
      const urlModule = require('url');
      const parsedUrl = urlModule.parse(downloadUrl);
      const httpModule = parsedUrl.protocol === 'https:' ? https : require('http');
      
      const request = httpModule.get(downloadUrl, (response) => {
        // Handle redirects (including cross-protocol)
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location;
          if (redirectUrl && attempt <= 10) {
            request.abort();
            file.close();
            fs.unlink(downloadPath, () => {});
            
            // Handle relative redirects
            const finalRedirectUrl = redirectUrl.startsWith('http') 
              ? redirectUrl 
              : `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
            
            console.log(`Redirect ${attempt}: ${downloadUrl} -> ${finalRedirectUrl}`);
            downloadFile(finalRedirectUrl, attempt + 1);
            return;
          } else {
            file.close();
            fs.unlink(downloadPath, () => {});
            reject(new Error(`Too many redirects (${attempt}) or invalid redirect URL`));
            return;
          }
        }
        
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(downloadPath, () => {});
          reject(new Error(`Download failed with status: ${response.statusCode} - ${response.statusMessage || 'Unknown error'}`));
          return;
        }