// various import
import {
	Action,
	ActionPanel,
	Detail,
	Icon,
	List,
	showToast,
	Toast,
	Color,
	useNavigation
} from "@vicinae/api";
import {
	useEffect,
	useState
} from 'react';
interface PackageDescription{
    pkgname: string
    pkgbase: string
    repo: string
    arch: string
    pkgver: string
    pkgrel: string
    epoch: number
    pkgdesc: string
    url: string
    filename: string
    compressed_size: number
    installed_size: number
    build_date: string //for now, going to try to parse this later (TODO)
    last_update: string // same as for build_date (TODO)
    flag_date: null | string //in case it was flagged
    maintainers: string[]
    packager: string
    groups: string[]
    licenses: string[]
    conflicts: string[]
    provides: string[]
    replaces: string[]
    depends: string[]
    optdepends: string[]
    makedepends: string[]
    checkdepends: string[]
}
interface PackageSearchResult {
    version: number
    limit: number
    valid: boolean
    results: PackageDescription[]
    num_pages: number
    count: number
    page: number
}
interface AURPackageDescription{
    Description: string
    FirstSubmitted: EpochTimeStamp
    ID: number
    LastModified: EpochTimeStamp
    Maintainer: string
    Name: string
    NumVotes: number
    OutOfDate: null | EpochTimeStamp
    PackageBase: string
    PackageBaseID: number
    Popularity: number
    URL: string
    URLPath: string
    Version: string

}
interface AURSearchResult {
    resultcount: number
    results: AURPackageDescription[]
    type: string
    version: number
}
interface SearchState {
    officialResults: PackageDescription[]
    AURResults: AURPackageDescription[]
}
const defaultOutput = {officialResults: [],AURResults: []} as SearchState

function useSearchPackage(searchTerm: string, source: string){
    const [packageSearch, setPackageSearch] = useState<SearchState>(defaultOutput)
        useEffect(() => {
        if(searchTerm.length==0){
            setPackageSearch(defaultOutput)
            return
        }

        const timeout = setTimeout(async ()=>{
        const toast = await showToast({ title: "Searching...", style: Toast.Style.Animated })

        if(source == "All"){
            toast.hide()
            return
        }

        else if (source == "AUR"){
            let urlEncodedSearchTerm = encodeURI(searchTerm)
            fetch(`https://aur.archlinux.org/rpc/v5/search/${urlEncodedSearchTerm}`).then((response)=> {
                if (!response.ok){
                    toast.title = "Failed to fetch the search results"
                    toast.message = String(response.status)
                    toast.style = Toast.Style.Failure
                    throw new Error(`Failed to fetch the search page: ${response.status}`)
                }
                return response.json()
            }).then((data)=> {
                let typedData = data as AURSearchResult
                setPackageSearch({officialResults:[], AURResults: typedData.results})
                toast.style = Toast.Style.Success;
                toast.title = "Search complete";
            })
        }
        else if (source == "Official"){
            let urlEncodedSearchTerm = encodeURI(searchTerm)
            fetch(`https://archlinux.org/packages/search/json/?q=${urlEncodedSearchTerm}`).then((response)=>{
                if (!response.ok){
                    toast.title = "Failed to fetch the search results"
                    toast.message = String(response.status)
                    toast.style = Toast.Style.Failure
                    throw new Error(`Failed to fetch the search page: ${response.status}`)
                }
                return response.json()
            }).then((data) => {
                let typedData = data as PackageSearchResult
                setPackageSearch({officialResults: typedData.results,AURResults:[]})
                toast.style = Toast.Style.Success;
                toast.title = "Search complete";
            })
        } 

        },200)
        return() => clearTimeout(timeout)

    },[searchTerm,source])


    return packageSearch
}

export default function ArchSeek(){
    const [query, setQuery] = useState("");
    const [sourceDropdown,setSourceDropdown] = useState("All")
    const [selectedId, setSelectedId] = useState<string | null>(null);
    let selectedPackage
    let testText = useSearchPackage(query, sourceDropdown)

    return(
        <List searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start" onSelectionChange={(id) => setSelectedId(id)} searchBarAccessory={
        <List.Dropdown tooltip="Source" value={sourceDropdown} onChange={setSourceDropdown}>
            <List.Dropdown.Item title="All" value="All"/>
            <List.Dropdown.Item title="AUR" value="AUR"/>
            <List.Dropdown.Item title="Official repos only" value="Official"/>
        </List.Dropdown>
    }>
            {query === "" ?(
                <List.EmptyView title="No Package Found" description="Try to search something else." icon={{source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}}/>
            ) : (
                <>
                {testText.officialResults.map((officialPackage,index) =>
                <List.Item id={String(index)} title={officialPackage.pkgname} key={`${officialPackage.pkgname}-${officialPackage.repo}-${officialPackage.arch}`} icon="Arch_Linux_logo.svg" detail={
                    <List.Item.Detail markdown={`# ${officialPackage.pkgname}  \n**Architecture:** ${officialPackage.arch}  \n**Repository:** ${officialPackage.repo}  \n**Description:** ${officialPackage.pkgdesc}  \n**Upstream URL:** ${officialPackage.url}  \n**License(s):** ${officialPackage.licenses.toString()}  \n**Maintainers:** ${officialPackage.maintainers}  \n**Package Size:** ${officialPackage.compressed_size}MB  \n**Installed Size:** ${officialPackage.installed_size}MB  \n**Last Packager:** ${officialPackage.packager}  \n**Build Date:** ${officialPackage.build_date}  \n**Signed By:** ${officialPackage}  \n**Last Updated:** ${officialPackage.last_update}`}/>
                } accessories={[
                    { tag: { value: "Arch Repos", color: Color.Blue}}
                ]} actions={
                    <ActionPanel>
                        <Action.CopyToClipboard title="Copy upsteam url to clipboard" content={officialPackage.url} icon={Icon.CopyClipboard}/>
                        <Action.CopyToClipboard title="Copy package url to clipboard" content={`https://archlinux.org/packages/${officialPackage.repo}/${officialPackage.arch}/${officialPackage.pkgname}/`} icon={Icon.CopyClipboard}/>
                        <Action.OpenInBrowser title="Open package in the browser" url={`https://archlinux.org/packages/${officialPackage.repo}/${officialPackage.arch}/${officialPackage.pkgname}/`} icon="Arch_Linux_logo.svg"/>
                    </ActionPanel>
                }/>

                )}
                {testText.AURResults.map((AURPackage,index) => 
                <List.Item id={String(index)} title={AURPackage.Name} key={`${AURPackage.ID}`} icon="Arch_Linux_logo.svg" detail={
                    <List.Item.Detail markdown={`# ${AURPackage.Name}  \n**Package Base:** ${AURPackage.PackageBase}  \n**Description:** ${AURPackage.Description}  \n**Upstream URL:** ${AURPackage.URL}  \n**Keywords:** EMPTY FOR NOW  \n**Licenses:** EMPTY FOR NOW  \n**Conflicts:** EMPTY FOR NOW  \n**Provides:** EMPTY FOR NOW  \n**Submitter:** SOME STUFF  \n**Maintaineer:** ${AURPackage.Maintainer}  \n**Last Packager:** EMPTY FOR NOW  \n**Votes:** ${AURPackage.NumVotes}  \n**Popularity:** ${AURPackage.Popularity}  \n**First Submitted:** ${AURPackage.FirstSubmitted}  \n**Last Updated:** ${AURPackage.LastModified}`}/>
                } accessories={[
                    { tag: { value: "AUR", color: Color.Green}}
                ]} actions={
                    <ActionPanel>
                        <Action.CopyToClipboard title="Copy upstream url to clipboard" content={AURPackage.URL} icon={Icon.CopyClipboard}/>
                        <Action.CopyToClipboard title="Copy package url to clipboard" content={`https://aur.archlinux.org/packages/${AURPackage.Name}`}/>
                        <Action.OpenInBrowser title="Open package in the browser" url={`https://aur.archlinux.org/packages/${AURPackage.Name}`} icon="Arch_Linux_logo.svg"/>
                    </ActionPanel>
                }/>
                
            )}
            

                 </>   
            )
            
            }
        </List>
    );
}