Summary: F5 BIGIP Runtime Init
Version: %{_version}
Name: %{_name}
Release: %{_release}
BuildArch: noarch
Group: Development/Tools
License: Commercial
Packager: F5 Networks <support@f5.com>


%description
F5 BIGIP Runtime Init installs extensions and configures BIGIP system. This package is for %{cloud} cloud

%define APP_INSTALL_DIR /%{name}


%prep
cp -r %{main}/dist/working/%{cloud}/src/ %{_builddir}/src/
cp -r %{main}/dist/working/%{cloud}/package.json %{_builddir}
cp -r %{main}/dist/working/%{cloud}/node_modules %{_builddir}
echo -n %{version}-%{release} > %{_builddir}/src/version


%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT%{APP_INSTALL_DIR}
cp -r %{_builddir}/* $RPM_BUILD_ROOT%{APP_INSTALL_DIR}

%post
# Starting post process
echo "post stage..."


%clean
rm -rf $RPM_BUILD_ROOT


%files
%defattr(-,root,root)
%{APP_INSTALL_DIR}
