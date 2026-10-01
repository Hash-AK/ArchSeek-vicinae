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
const {exec}= require('child_process')

function useSearchPackage(searchTerm: string, source: string){
    const defaultPackageDesc = {pkgname: ""} as PackageDescription
    const defaultOutput = {version: 2,limit: 250,valid: true,num_pages: 1,count: 0,page:1,results: []} as PackageSearchResult
    const [packageSearch, setPackageSearch] = useState<PackageSearchResult>(defaultOutput)
    if(source == "All"){

    }
    else if (source == "AUR"){

    }
    else if (source == "Official"){

    } 
    useEffect(() => {
        if(searchTerm.length==0){
            setPackageSearch(defaultOutput)
            return
        }
        const timeout = setTimeout(()=>{
            let urlEncodedSearchTerm = encodeURI(searchTerm)
            fetch(`https://archlinux.org/packages/search/json/?q=${urlEncodedSearchTerm}`).then((response)=>{
                if (!response.ok){
                    showToast({ title: "Failed to fetch the search results",message: String(response.status),style: Toast.Style.Failure})
                    throw new Error(`Failed to fetch the search page: ${response.status}`)
                }
                return response.json()
            }).then((data) => {
                let typedData = data as PackageSearchResult
                console.dir(typedData, {depth: null})
                setPackageSearch(typedData)
            })
        },200)
        return() => clearTimeout(timeout)
    },[searchTerm])
    return packageSearch
}

export default function ArchSeek(){
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    let selectedPackage
    let testText = useSearchPackage(query, "All")
    return(
        <List searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start" onSelectionChange={(id) => setSelectedId(id)}>
            {query === "" ?(
                <List.EmptyView title="No Package Found" description="Try to search something else." icon={{source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}}/>
            ) : (
                testText.results.map((title,index) =>
                <List.Item id={String(index)} title={title.pkgname} key={`${title.pkgname}-${title.repo}-${title.arch}`} icon="Arch_Linux_logo.svg" detail={
                    <List.Item.Detail markdown={title.pkgdesc}/>
                } accessories={[
                    { tag: { value: "Arch Repos", color: Color.Blue}}
                ]} actions={
                    <ActionPanel>
                        <Action.CopyToClipboard title="Copy upsteam url to clipboard" content={title.url} icon={Icon.CopyClipboard}/>
                        <Action.CopyToClipboard title="Copy package url to clipboard" content={`https://archlinux.org/packages/${title.repo}/${title.arch}/${title.pkgname}/`} icon={Icon.CopyClipboard}/>
                        <Action.OpenInBrowser title="Open package in the browser" url={`https://archlinux.org/packages/${title.repo}/${title.arch}/${title.pkgname}/`} icon="Arch_Linux_logo.svg"/>
                    </ActionPanel>
                }/>
                )

            )}
        </List>
    );
}