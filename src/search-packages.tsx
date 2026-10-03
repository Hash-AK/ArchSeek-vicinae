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
    getPreferenceValues,
	useNavigation
} from "@vicinae/api";
import {
	useEffect,
	useState
} from 'react';
interface Preferences {
    "aur-helper": string;
}
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
interface AURPackageMoreInfoResult{ //sob
resultcount: number
results: AURPackageMoreInfoDescription[]
type: string
version: number
}
interface AURPackageMoreInfoDescription{
    CoMaintainers: string[]
    Conflicts: string[]
    Depends: string[]
    Description: string
    FirstSubmitted: EpochTimeStamp
    ID: number
    Keywords: string[]
    LastModified: EpochTimeStamp
    License: string[]
    Maintainer: string
    MakeDepends: string[]
    Name: string
    NumVotes: number
    OutOfDate: null | EpochTimeStamp
    PackageBase: string
    PackageBaseID: number
    Popularity: number
    Provides: string[]
    Submitter: string
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
const defaultAurMoreInfoDescription = {CoMaintainers: [""],Conflicts: [""],Depends:[""],Description: "",FirstSubmitted:0,ID:0,Keywords:[""],LastModified:0,License:[""],Maintainer:"",MakeDepends:[""],Name:"",NumVotes:0,OutOfDate:null,PackageBase:"",PackageBaseID:0,Popularity:0,Provides:[""],Submitter:"",URL:"",URLPath:"",Version:""} as AURPackageMoreInfoDescription
const defaultOutput = {officialResults: [],AURResults: []} as SearchState
const prefs = getPreferenceValues<Preferences>();
function useGetMoreAURInfo(packageName: string|null){
    const [info,setInfo] = useState<AURPackageMoreInfoDescription>(defaultAurMoreInfoDescription)
    useEffect(() => {
    if (packageName == null){
        return
    }
    if (packageName.length == 0){
        return
    }

    (async() =>{
    const toast = await showToast({ title: "Fetching package info...", style: Toast.Style.Animated})
    let urlEncodedName = encodeURI(packageName)
    fetch(`https://aur.archlinux.org/rpc/v5/info?arg[]=${urlEncodedName}`).then((response) =>{
        if(!response.ok){
            toast.title = "Failed to fetch package info"
            toast.message = String(response.status)
            toast.style = Toast.Style.Failure
            throw new Error(`Failed to fetch the page: ${response.status}`)
        }
        return response.json()
    }).then((data) =>{
        let typedData = data as AURPackageMoreInfoResult
        let results = typedData.results[0] as AURPackageMoreInfoDescription
        setInfo(results)
        toast.style = Toast.Style.Success
        toast.title = "Package info fetched!"
    })
    })()
    },[packageName])
    return info
}
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
function useFetchPKGBUILD(packageName:string|null){
    const [pkgText, setPkgText] = useState<string>("")


    useEffect(()=>{
    if (packageName == null){
        return
    }
    if (packageName.length == 0){
        return
    }
        const encodedPackageName = encodeURI(packageName)
        fetch(`https://aur.archlinux.org/cgit/aur.git/plain/PKGBUILD?h=${encodedPackageName}`).then((response) =>{
            if (!response.ok){
                throw new Error(`Failed to fetch PKGBUILD:: ${response.status}`)
            }
            return response.text()
        }).then((data) =>{
            console.log(data)
            setPkgText(data)
        })
    },[packageName])
    return pkgText
}
function ReadPKGBUILD(PKGBUILD:string|null){

    return(
        <Detail markdown={`# PKGBUILD  \n\`\`\`  \n${PKGBUILD}\`\`\`\``} actions={
            <ActionPanel>
            </ActionPanel>
        }/>
    )
}
export default function ArchSeek(){
    const [query, setQuery] = useState("");
    const [sourceDropdown,setSourceDropdown] = useState("All")
    const [selectedId, setSelectedId] = useState<string | null>(null);
    let selectedPackage: string| null = null
    let selectedPKGBase: string | null = null
    let AURPackageInfo: AURPackageMoreInfoDescription = defaultAurMoreInfoDescription
    let PKGBUILD : string|null = null

    let testText = useSearchPackage(query, sourceDropdown)
    if (selectedId != null){
        if (Number(selectedId) < testText.AURResults.length && sourceDropdown == "AUR" || Number(selectedId) < testText.officialResults.length && sourceDropdown == "Official"){
            if(sourceDropdown == "AUR"){
                selectedPackage = testText.AURResults[Number(selectedId)].Name
                selectedPKGBase = testText.AURResults[Number(selectedId)].PackageBase
            } else if (sourceDropdown == "Official"){
                selectedPackage = testText.officialResults[Number(selectedId)].pkgname
            }
        } 
    } else {
        selectedPackage = ""
    }
    AURPackageInfo = useGetMoreAURInfo(selectedPackage)
    PKGBUILD = useFetchPKGBUILD(selectedPKGBase)
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
                    <List.Item.Detail markdown={`# ${officialPackage.pkgname}  \n**Architecture:** ${officialPackage.arch}  \n**Repository:** ${officialPackage.repo}  \n**Description:** ${officialPackage.pkgdesc}  \n**Upstream URL:** ${officialPackage.url}  \n**License(s):** ${Array.isArray(officialPackage.licenses) && (officialPackage.licenses?.length) > 0 ? `${officialPackage.licenses.toString()}  \n` : ""}**Maintainers:** ${officialPackage.maintainers}  \n**Package Size:** ${officialPackage.compressed_size}MB  \n**Installed Size:** ${officialPackage.installed_size}MB  \n**Last Packager:** ${officialPackage.packager}  \n**Build Date:** ${officialPackage.build_date}  \n**Signed By:** ${officialPackage}  \n**Last Updated:** ${officialPackage.last_update}`}/>
                } accessories={[
                    { tag: { value: "Arch Repos", color: Color.Blue}}
                ]} actions={
                    <ActionPanel>
                        <Action.CopyToClipboard title="Copy upsteam url to clipboard" content={officialPackage.url} icon={Icon.CopyClipboard}/>
                        <Action.CopyToClipboard title="Copy package url to clipboard" content={`https://archlinux.org/packages/${officialPackage.repo}/${officialPackage.arch}/${officialPackage.pkgname}/`} icon={Icon.CopyClipboard}/>
                        <Action.OpenInBrowser title="Open package in the browser" url={`https://archlinux.org/packages/${officialPackage.repo}/${officialPackage.arch}/${officialPackage.pkgname}/`} icon="Arch_Linux_logo.svg"/>
                        <Action.RunInTerminal title="Install package" args={["/bin/bash","-c",`set -x;sudo pacman -S --needed ${officialPackage.pkgname}`]} options={{hold:true}}/>
                    </ActionPanel>
                }/>

                )}
                {testText.AURResults.map((AURPackage,index) => 
                <List.Item id={String(index)} title={AURPackage.Name} key={`${AURPackage.ID}`} icon="Arch_Linux_logo.svg" detail={
                    <List.Item.Detail markdown={`# ${AURPackage.Name}  \n**Package Base:** ${AURPackage.PackageBase}  \n**Description:** ${AURPackage.Description}  \n**Upstream URL:** ${AURPackage.URL}  \n${Array.isArray(AURPackageInfo?.Keywords) && (AURPackageInfo?.Keywords?.length) > 0 ?  `**Keywords:** ${AURPackageInfo.Keywords.toString()}  \n`: "" }${Array.isArray(AURPackageInfo?.License) && (AURPackageInfo?.License?.length) > 0 ? `**Licenses:** ${AURPackageInfo.License.toString()}  \n` : ""}${ Array.isArray(AURPackageInfo?.Conflicts?.length) && (AURPackageInfo.Conflicts?.length) >0 ?`**Conflicts:** ${AURPackageInfo.Conflicts.toString()}  \n` : ""}${ Array.isArray(AURPackageInfo.Provides)&& (AURPackageInfo.Provides?.length) > 0 ? `**Provides:** ${AURPackageInfo.Provides.toString()}  \n` : ""}**Submitter:** ${AURPackageInfo.Submitter}  \n**Maintainers:** ${AURPackage.Maintainer}${Array.isArray(AURPackageInfo.CoMaintainers)&&(AURPackageInfo.CoMaintainers?.length) >0 ? `(${AURPackageInfo.CoMaintainers.toString()})` : ""}  \n**Votes:** ${AURPackage.NumVotes}  \n**Popularity:** ${AURPackage.Popularity}  \n**First Submitted:** ${AURPackage.FirstSubmitted}  \n**Last Updated:** ${AURPackage.LastModified}`}/>
                } accessories={[
                    { tag: { value: "AUR", color: Color.Green}}
                ]} actions={
                    <ActionPanel>
                        <Action.CopyToClipboard title="Copy upstream url to clipboard" content={AURPackage.URL} icon={Icon.CopyClipboard}/>
                        <Action.CopyToClipboard title="Copy package url to clipboard" content={`https://aur.archlinux.org/packages/${AURPackage.Name}`}/>
                        <Action.OpenInBrowser title="Open package in the browser" url={`https://aur.archlinux.org/packages/${AURPackage.Name}`} icon="Arch_Linux_logo.svg"/>
                        <Action.Push title="Open PKGBUILD" target={ReadPKGBUILD(PKGBUILD)} icon={Icon.NewDocument}/>
                        <Action.RunInTerminal title="Install package" args={["/bin/bash","-c",`set -x;${[prefs["aur-helper"]]} -S --needed ${AURPackage.Name}`]} options={{hold:true}} />
                    </ActionPanel>
                }/>
                
            )}
            

                 </>   
            )
            
            }
        </List>
    );
}